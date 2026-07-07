import React, { useState } from 'react';
import { useLang } from '../context/LangContext';
import { useAlertLog } from '../context/AlertLogContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classifyRisk, calculateHospitalScore, checkSymptomConsistency, haversineKm } from '../lib/health-logic';
import { userProfile } from '../data/demo-content';
import { useHospitals, useDoctors, useZones } from '../hooks/useApiData';
import { PatientMap } from '../components/PatientMap';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { QRModal } from '../components/QRModal';
import { useToast } from '@/hooks/use-toast';

interface Verdict {
  risk: string;
  hospital: ReturnType<typeof calculateHospitalScore>;
  runnerUp: ReturnType<typeof calculateHospitalScore>;
  extracted: string;
  locality: string;          // locality captured at verdict time
}

export default function Patient() {
  const { t, lang } = useLang();
  const { addAlert } = useAlertLog();
  const { toast } = useToast();

  const { data: hospitals = [] } = useHospitals();
  const { data: doctorDirectory = [] } = useDoctors();
  const { data: zones = [] } = useZones();
  const localityCoords: Record<string, [number, number]> = React.useMemo(
    () => Object.fromEntries(zones.map(z => [z.locality, [z.lat, z.lng] as [number, number]])),
    [zones]
  );

  const [text, setText] = useState('');
  const [locality, setLocality] = useState('Banganga');
  const [phase, setPhase] = useState<'idle' | 'calling' | 'extracting' | 'verdict' | 'sending'>('idle');
  const [result, setResult] = useState<Verdict | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [voiceAlertActive, setVoiceAlertActive] = useState(false);
  const [micListening, setMicListening] = useState(false);
  const [vaaniReply, setVaaniReply] = useState<string | null>(null);
  const [vaaniLoading, setVaaniLoading] = useState(false);
  const [currentPatientCoords, setCurrentPatientCoords] = useState<[number, number]>([22.7196, 75.8577]);
  const reqIdRef = React.useRef(0);   // guards stale async responses

  const speak = (msg: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(msg);
      u.lang = 'hi-IN';
      u.rate = 0.92;
      u.pitch = 1.02;
      window.speechSynthesis.speak(u);
    }
  };

  const handleScenario = (scenarioText: string) => {
    setText(scenarioText);
  };

  // ─── Feature 8: Voice-to-Alert — auto-trigger on Hindi emergency speech ──
  const handleMic = () => {
    type AnySpeechRecognition = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };

    const w = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor: (new () => AnySpeechRecognition) | undefined =
      (w.SpeechRecognition as (new () => AnySpeechRecognition) | undefined) ||
      (w.webkitSpeechRecognition as (new () => AnySpeechRecognition) | undefined);

    if (!SpeechRecognitionCtor) {
      toast({ title: "Voice input not supported in this browser", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setMicListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      setMicListening(false);

      // Auto-classify without pressing button
      const quickRisk = classifyRisk(transcript);
      if (quickRisk === 'RED') {
        setVoiceAlertActive(true);
        speak("आपातकाल की स्थिति है। रिपोर्ट दर्ज की जा रही है।");
        toast({
          title: "🚨 Voice-to-Alert Activated",
          description: `Hindi emergency detected: "${transcript.substring(0, 60)}…" — Auto-processing now.`,
        });
        // Slight delay so user can see what was transcribed, then auto-call
        setTimeout(() => {
          placeCallWith(transcript, locality);
          setVoiceAlertActive(false);
        }, 1200);
      } else {
        // Non-emergency: just fill the text box, let user confirm
        toast({ title: "🎤 Voice captured", description: "Review and press Place Call to submit." });
      }
    };

    recognition.onerror = () => {
      setMicListening(false);
      toast({ title: "Voice capture failed", description: "Please try again or type your report.", variant: "destructive" });
    };

    recognition.onend = () => setMicListening(false);

    recognition.start();
  };

  const placeCallWith = (reportText: string, loc: string) => {
    if (!reportText.trim()) return;
    setPhase('calling');
    setResult(null);
    setVaaniReply(null);
    setVaaniLoading(true);

    // ── Real AI response in parallel — request-ID guards stale responses ──
    const thisReqId = ++reqIdRef.current;
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reportText, history: [] }),
    })
      .then(r => r.json())
      .then((d: { reply: string }) => { if (reqIdRef.current === thisReqId) setVaaniReply(d.reply); })
      .catch(() => { if (reqIdRef.current === thisReqId) setVaaniReply(null); })
      .finally(() => { if (reqIdRef.current === thisReqId) setVaaniLoading(false); });

    setTimeout(() => {
      setPhase('extracting');
      setTimeout(() => {
        const risk = classifyRisk(reportText);
        const patientLoc = localityCoords[loc] || [22.7196, 75.8577] as [number, number];
        setCurrentPatientCoords(patientLoc);

        const scoredHospitals = hospitals
          .map(h => calculateHospitalScore(h, patientLoc, risk === 'RED' && reportText.toLowerCase().includes('chest')))
          .sort((a, b) => b.score - a.score);

        const verdict: Verdict = {
          risk,
          hospital: scoredHospitals[0],
          runnerUp: scoredHospitals[1],
          extracted: reportText.substring(0, 60) + (reportText.length > 60 ? "..." : ""),
          locality: loc,
        };

        setPhase('verdict');
        setResult(verdict);

        let responseMsg = "Report logged successfully.";
        if (risk === 'RED') {
          responseMsg = "यह एक आपात स्थिति है। हम आपके लिए अस्पताल खोज रहे हैं।";
          addAlert({
            locality: loc,
            rule: "Emergency Keyword Detection",
            detail: `RED alert in ${loc}. Best match: ${verdict.hospital.name}.`,
            transcript: reportText,
            field: `risk: RED`,
            risk: "red",
            time: "Just now"
          });
        } else if (risk === 'YELLOW') {
          responseMsg = "हमने इसे दर्ज कर लिया है। कृपया ध्यान रखें।";
          addAlert({
            locality: loc,
            rule: "Routine Monitoring",
            detail: `YELLOW flag in ${loc}. Needs follow-up.`,
            transcript: reportText,
            field: `risk: YELLOW`,
            risk: "yellow",
            time: "Just now"
          });
        }

        speak(responseMsg);
        setTimeout(() => setPhase('sending'), 1400);
      }, 1600);
    }, 1200);
  };

  const placeCall = () => {
    if (phase !== 'idle' && phase !== 'sending') return;
    placeCallWith(text, locality);
  };

  // ─── Feature 19: Health SOS Card Sharing ─────────────────────────────────
  const shareSosCard = () => {
    const link = `https://arogya.indore.gov.in/sos/${userProfile.abhaId.replace(/-/g, '')}`;
    navigator.clipboard.writeText(link).catch(() => {});
    toast({
      title: "🔗 SOS Card Link Copied",
      description: `Share this link with family: ${link}`,
    });
  };

  const consistency = result ? checkSymptomConsistency(text, result.risk) : null;

  return (
    <>
      <QRModal open={showQR} onClose={() => setShowQR(false)} />

      {/* Voice-to-Alert pulse overlay */}
      <AnimatePresence>
        {voiceAlertActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#B23A2E]/20 z-40 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="bg-[#B23A2E] text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-lg"
            >
              🎤 Hindi Emergency Detected — Auto-Processing…
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Quick-action bar */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(true)}
              className="border-[#1F3A3D] text-[#1F3A3D] hover:bg-[#1F3A3D] hover:text-white gap-2"
            >
              📋 My Emergency QR Card
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareSosCard}
              className="border-[#3B8C5A] text-[#3B8C5A] hover:bg-[#3B8C5A] hover:text-white gap-2"
            >
              🔗 Share SOS Card
            </Button>
            <div className="ml-auto text-xs font-mono text-muted-foreground self-center">
              Patient: {userProfile.name} · {userProfile.bloodGroup}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
                  <div className="w-12 h-12 rounded-full bg-[#E4F1E7] flex items-center justify-center text-2xl">🙋‍♀️</div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-foreground">{t('patient.vaani')}</h2>
                    <div className="text-sm text-muted-foreground font-mono">Status: Ready</div>
                  </div>
                  <Button onClick={() => speak(lang === 'en' ? "Namaste, how can I help you today?" : "नमस्ते, मैं आपकी क्या सहायता कर सकती हूँ?")} variant="outline" className="ml-auto" data-testid="btn-play">
                    ▶ {t('patient.play')}
                  </Button>
                </div>

                {/* Voice-to-Alert hint */}
                <div className="mb-4 bg-[#FBF3E4] border border-[#E0952B]/30 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-xl">🎤</span>
                  <div>
                    <div className="text-xs font-bold text-[#C77B18] uppercase tracking-wide">Voice-to-Alert (Hindi)</div>
                    <div className="text-xs text-[#4C5C50] mt-0.5">Speak a Hindi emergency phrase and the system auto-detects, reports, and escalates — no button needed.</div>
                    <div className="text-xs font-mono text-[#C77B18] mt-1 italic">"Mere papa behosh ho gaye." → Auto RED alert 🚨</div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Quick Scenarios (Testing):</label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleScenario("मुझे बहुत तेज सीने में दर्द हो रहा है और सांस लेने में तकलीफ हो रही है। (Chest pain & breathlessness)")}>{t('scenario.1')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleScenario("बच्चे को तीन दिन से तेज बुखार है और उल्टी हो रही है। (Child high fever)")}>{t('scenario.2')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleScenario("खेत में काम करते समय सांप ने काट लिया है। (Snake bite)")}>{t('scenario.3')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleScenario("पीएचसी में पैरासिटामोल खत्म हो गई है। (Paracetamol stockout)")}>{t('scenario.4')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleScenario("Mere papa behosh ho gaye. (Father unconscious — Voice-to-Alert demo)")}>🎤 Voice Demo</Button>
                  </div>
                </div>

                <div className="relative mb-4">
                  <Textarea 
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={t('patient.placeholder')}
                    className={`min-h-[120px] resize-none pb-12 ${lang === 'hi' ? 'font-hindi text-lg' : ''}`}
                    data-testid="input-report"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <Button
                      size="icon"
                      variant={micListening ? "destructive" : "secondary"}
                      onClick={handleMic}
                      className={`rounded-full transition-all ${micListening ? 'animate-pulse' : ''}`}
                      title="Voice Input — Hindi emergency auto-detected"
                      data-testid="btn-mic"
                    >
                      {micListening ? '🔴' : '🎤'}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Select value={locality} onValueChange={setLocality}>
                      <SelectTrigger data-testid="select-locality">
                        <SelectValue placeholder="Locality" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(localityCoords).map(loc => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={placeCall} disabled={phase !== 'idle' && phase !== 'sending'} className="flex-1 text-lg h-auto py-3 bg-[#3B8C5A] hover:bg-[#2e6e46] text-white" data-testid="btn-place-call">
                    {t('patient.place_call')}
                  </Button>
                </div>

                {/* Phase Tracker */}
                <div className="bg-muted p-4 rounded-xl flex items-center justify-between relative">
                  <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-border -z-10 transform -translate-y-1/2"></div>
                  {['Idle', 'Calling', 'Extracting', 'Verdict', 'Sending'].map((step, i) => {
                    const stepLower = step.toLowerCase();
                    const active = phase === stepLower;
                    const past = ['idle', 'calling', 'extracting', 'verdict', 'sending'].indexOf(phase) > i;
                    return (
                      <div key={step} className="flex flex-col items-center bg-muted px-2">
                        <div className={`w-4 h-4 rounded-full mb-2 transition-colors ${active ? 'bg-primary ring-4 ring-primary/20' : past ? 'bg-[#3B8C5A]' : 'bg-border'}`}></div>
                        <div className={`text-[10px] font-mono uppercase ${active || past ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{step}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-2xl shadow-sm border border-border flex flex-col min-h-[400px]">
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">{t('patient.risk_chart')}</h2>
                
                <AnimatePresence mode="wait">
                  {!result && phase !== 'idle' && (
                    <motion.div key="loading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex items-center justify-center text-muted-foreground font-mono">
                      {phase === 'calling' && "Connecting to Vaani..."}
                      {phase === 'extracting' && "Extracting symptoms & context..."}
                    </motion.div>
                  )}

                  {result && (
                    <motion.div key="result" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="flex-1 space-y-4">
                      
                      {/* Risk Banner */}
                      <div className={`p-4 rounded-xl border flex items-start gap-4 ${
                        result.risk === 'RED' ? 'bg-[#F8E3DF] border-[#B23A2E]/20 text-[#B23A2E]' : 
                        result.risk === 'YELLOW' ? 'bg-[#FBEED9] border-[#C77B18]/20 text-[#C77B18]' : 
                        'bg-[#E4F1E7] border-[#3B8C5A]/20 text-[#3B8C5A]'
                      }`}>
                        <div className="text-3xl mt-1">
                          {result.risk === 'RED' ? '🚨' : result.risk === 'YELLOW' ? '⚠️' : '✅'}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg mb-1">{result.risk} RISK</div>
                          <div className="text-sm opacity-90 font-mono">Extracted: {result.extracted}</div>
                        </div>
                      </div>

                      {/* ─── Feature 15: Fake Symptom Detection ─────────────── */}
                      {consistency && (
                        <div className={`p-4 rounded-xl border ${
                          consistency.verdict === 'Consistent' ? 'bg-[#E4F1E7] border-[#3B8C5A]/30' :
                          consistency.verdict === 'Minor Discrepancy' ? 'bg-[#FBEED9] border-[#C77B18]/30' :
                          'bg-[#F8E3DF] border-[#B23A2E]/30'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold uppercase tracking-widest text-[#4C5C50]">
                              AI Consistency Check
                            </div>
                            <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              consistency.verdict === 'Consistent' ? 'bg-[#3B8C5A] text-white' :
                              consistency.verdict === 'Minor Discrepancy' ? 'bg-[#C77B18] text-white' :
                              'bg-[#B23A2E] text-white'
                            }`}>
                              {consistency.verdict}
                            </div>
                          </div>
                          {/* Score bar */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-1 bg-white/60 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  consistency.score >= 80 ? 'bg-[#3B8C5A]' :
                                  consistency.score >= 55 ? 'bg-[#C77B18]' : 'bg-[#B23A2E]'
                                }`}
                                style={{ width: `${consistency.score}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#1B2A22]">{consistency.score}/100</span>
                          </div>
                          {consistency.flags.length > 0 ? (
                            <div className="space-y-1">
                              {consistency.flags.map((f, i) => (
                                <div key={i} className="text-xs text-[#4C5C50] flex gap-1.5">
                                  <span>⚑</span><span>{f}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-[#3B8C5A]">✓ Symptom pattern matches risk profile. No anomalies detected.</div>
                          )}
                        </div>
                      )}

                      {/* Vaani Response — real AI */}
                      <div className={`p-4 rounded-xl border ${
                        result.risk === 'RED'   ? 'bg-[#F8E3DF] border-[#B23A2E]/20' :
                        result.risk === 'YELLOW' ? 'bg-[#FBEED9] border-[#C77B18]/20' :
                        'bg-[#E4F1E7] border-[#3B8C5A]/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-lg">🙋‍♀️</div>
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Vaani's Assessment</div>
                          {vaaniLoading && <div className="ml-auto flex gap-1">{[0,1,2].map(i=><motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" animate={{y:[0,-4,0]}} transition={{repeat:Infinity,duration:0.6,delay:i*0.15}}/>)}</div>}
                        </div>
                        <p className={`text-sm leading-relaxed text-foreground ${lang === 'hi' ? 'text-base' : ''}`}>
                          {vaaniLoading && !vaaniReply
                            ? (lang === 'en' ? "Vaani is thinking…" : "वाणी सोच रही है…")
                            : vaaniReply
                            ?? (result.risk === 'RED'
                              ? "यह एक आपात स्थिति है। कृपया तुरंत 108 पर कॉल करें और नजदीकी अस्पताल जाएं।"
                              : result.risk === 'YELLOW'
                              ? "लक्षण मध्यम जोखिम के हैं। 24 घंटे में नजदीकी PHC या डॉक्टर से मिलें।"
                              : "लक्षण हल्के हैं। घर पर आराम करें और खूब पानी पिएं।")}
                        </p>
                        <div className="mt-3 text-[10px] text-muted-foreground flex gap-3 font-mono">
                          <span>✓ AI checked</span><span>✓ Safety validated</span><span>✓ Protocol applied</span>
                        </div>
                      </div>

                      {/* ── Ambulance card (RED only) ───────────────────── */}
                      {result.risk === 'RED' && (
                        <div className="bg-[#B23A2E] text-white rounded-xl p-4 flex items-center gap-4">
                          <div className="text-3xl">🚑</div>
                          <div className="flex-1">
                            <div className="font-bold text-sm mb-0.5">Nearest Ambulance Station</div>
                            <div className="text-xs opacity-80">
                              {result.hospital.name} · {result.hospital.dist.toFixed(1)} km away
                              <span className="ml-2">~{Math.ceil(result.hospital.dist / 40 * 60)} min ETA</span>
                            </div>
                          </div>
                          <a
                            href="tel:108"
                            className="shrink-0 bg-white text-[#B23A2E] font-bold text-sm px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            📞 Call 108
                          </a>
                        </div>
                      )}

                      {/* ── Nearby doctors (YELLOW / GREEN) ────────────── */}
                      {result.risk !== 'RED' && (() => {
                        const phcName = `PHC ${result.locality}`;
                        const phcCoords = localityCoords[result.locality] ?? ([22.7196, 75.8577] as [number, number]);
                        const nearbyDocs = doctorDirectory.filter(d => d.present);
                        // Sort by distance of their PHC locality to patient
                        const docsWithDist = nearbyDocs.map(d => {
                          const docLoc = d.phc.replace('PHC ', '');
                          const coords = localityCoords[docLoc] ?? phcCoords;
                          return { ...d, dist: haversineKm(currentPatientCoords, coords) };
                        }).sort((a,b) => a.dist - b.dist).slice(0, 3);

                        return docsWithDist.length > 0 ? (
                          <div className="rounded-xl border border-border overflow-hidden">
                            <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b border-border">
                              <span className="text-base">🏥</span>
                              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Available Doctors Nearby</span>
                            </div>
                            {docsWithDist.map((d, i) => (
                              <div key={i} className={`px-4 py-3 flex items-center gap-3 ${i < docsWithDist.length-1 ? 'border-b border-border' : ''}`}>
                                <div className="w-8 h-8 rounded-full bg-[#E4F1E7] flex items-center justify-center text-sm shrink-0">👨‍⚕️</div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{d.name}</div>
                                  <div className="text-xs text-muted-foreground">{d.specialty} · {d.phc}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs font-mono text-[#3B8C5A] font-bold">{d.dist.toFixed(1)} km</div>
                                  <div className="text-[10px] text-[#3B8C5A]">● On duty</div>
                                </div>
                              </div>
                            ))}
                            {result.risk === 'YELLOW' && (
                              <div className="px-4 py-2 bg-[#FBEED9] text-[11px] text-[#C77B18] font-mono border-t border-border">
                                ⚠ Visit {phcName} within 24 hours
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}

                      {/* Emergency Escalation (RED only) */}
                      {result.risk === 'RED' && (
                        <div className="space-y-3">
                          <h3 className="font-serif font-bold text-lg border-b border-border pb-2">Emergency Escalation</h3>

                          <div className="bg-secondary text-secondary-foreground p-4 rounded-xl shadow-md">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="text-xs text-primary font-mono mb-1">BEST MATCH</div>
                                <div className="font-bold text-lg">{result.hospital.name}</div>
                              </div>
                              <Badge variant="outline" className="border-primary/30 text-primary">{result.hospital.dist.toFixed(1)} km</Badge>
                            </div>
                            <div className="text-sm text-secondary-foreground/80 mb-3">
                              ICU: {result.hospital.icu ? 'Yes' : 'No'} · Trauma: {result.hospital.trauma ? 'Yes' : 'No'} · Score: {result.hospital.score.toFixed(1)}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">Dispatch Ambulance</Button>
                              <Button size="sm" variant="outline" onClick={shareSosCard}>🔗 Share SOS Card</Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-card border border-border p-3 rounded-lg text-sm text-center font-medium">📱 Alerting Family</div>
                            <div className="bg-card border border-border p-3 rounded-lg text-sm text-center font-medium">🏥 Notifying ER</div>
                          </div>

                          {/* Runner-up hospital */}
                          {result.runnerUp && (
                            <div className="bg-muted border border-border p-3 rounded-xl">
                              <div className="text-xs font-mono text-muted-foreground mb-1">Alternative Option</div>
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{result.runnerUp.name}</span>
                                <span className="text-muted-foreground">{result.runnerUp.dist.toFixed(1)} km · Score {result.runnerUp.score.toFixed(1)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Map: patient + top hospitals ────────────────── */}
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                          <span>🗺</span> Nearby Hospitals — Indore
                          <span className="ml-auto font-normal normal-case text-[11px]">
                            {result.risk === 'RED' ? '🚨 Go to #1 now' : result.risk === 'YELLOW' ? '⚠ Visit within 24h' : '✅ PHC available'}
                          </span>
                        </div>
                        <PatientMap
                          key={`${currentPatientCoords[0]}-${currentPatientCoords[1]}-${result.hospital.name}-${result.risk}`}
                          patientCoords={currentPatientCoords}
                          hospitals={[result.hospital, ...(result.runnerUp ? [result.runnerUp] : [])]}
                          risk={result.risk}
                        />
                        {/* Legend */}
                        <div className="flex gap-4 mt-2 text-[10px] font-mono text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span style={{background: result.risk==='RED'?'#B23A2E':result.risk==='YELLOW'?'#C77B18':'#3B8C5A', width:8,height:8,borderRadius:'50%',display:'inline-block'}}/>
                            You
                          </span>
                          <span className="flex items-center gap-1"><span style={{background:'#B23A2E',width:8,height:8,borderRadius:'50%',display:'inline-block'}}/>1st choice</span>
                          {result.runnerUp && <span className="flex items-center gap-1"><span style={{background:'#C77B18',width:8,height:8,borderRadius:'50%',display:'inline-block'}}/>2nd choice</span>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {phase === 'idle' && !result && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm opacity-50">
                    Awaiting call...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
