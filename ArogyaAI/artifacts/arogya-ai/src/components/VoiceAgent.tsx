import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LangContext';

// ─── Browser Speech API types ─────────────────────────────────────────────────
interface SpeechRec extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror:  ((e: { error: string }) => void) | null;
  onend:    (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Risk   = 'GREEN' | 'YELLOW' | 'RED' | null;
type Source = 'gemini' | 'demo' | null;
type Phase  = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Turn {
  role: 'user' | 'vaani';
  text: string;
  risk?: Risk;
  source?: Source;
}

const RISK_COLOR: Record<NonNullable<Risk>, string> = {
  GREEN:  '#3B8C5A',
  YELLOW: '#C77B18',
  RED:    '#B23A2E',
};
const RISK_LABEL: Record<NonNullable<Risk>, string> = {
  GREEN:  '✅ Low risk',
  YELLOW: '⚠️ Moderate — visit PHC',
  RED:    '🚨 EMERGENCY — Call 108',
};

// ─── Waveform ─────────────────────────────────────────────────────────────────
const Waveform: React.FC<{ active: boolean; color: string }> = ({ active, color }) => (
  <div className="flex items-center justify-center gap-[3px] h-10">
    {Array.from({ length: 9 }).map((_, i) => (
      <motion.div
        key={i}
        style={{ backgroundColor: color, borderRadius: 99 }}
        className="w-[3px]"
        animate={active
          ? { height: [6, 24 + (i % 3) * 8, 6], opacity: [0.6, 1, 0.6] }
          : { height: 4, opacity: 0.25 }}
        transition={active
          ? { repeat: Infinity, duration: 0.6 + i * 0.07, ease: 'easeInOut', delay: i * 0.05 }
          : { duration: 0.3 }}
      />
    ))}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
interface VoiceAgentProps { isOpen: boolean; onClose: () => void; }

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ isOpen, onClose }) => {
  const { lang } = useLang();

  const [phase, setPhase]       = useState<Phase>('idle');
  const [turns, setTurns]       = useState<Turn[]>([]);
  const [interim, setInterim]   = useState('');
  const [lastRisk, setLastRisk] = useState<Risk>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoMode, setAutoMode] = useState(true);

  // ── Stable refs so callbacks always see fresh values ─────────────────────
  const phaseRef    = useRef<Phase>('idle');
  const autoRef     = useRef(autoMode);
  const langRef     = useRef(lang);
  const turnsRef    = useRef<Turn[]>([]);
  const recRef      = useRef<SpeechRec | null>(null);
  const restartRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Transcript captured inside a recognition session — avoids stale state closure
  const capturedRef = useRef('');
  const bottomRef   = useRef<HTMLDivElement>(null);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; },     [phase]);
  useEffect(() => { autoRef.current  = autoMode; },  [autoMode]);
  useEffect(() => { langRef.current  = lang; },      [lang]);
  useEffect(() => { turnsRef.current = turns; },     [turns]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns, interim]);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string, onEnd: () => void) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN'; u.rate = 0.92; u.pitch = 1.05;
    u.onend = onEnd;
    window.speechSynthesis.speak(u);
  }, []);

  // ── Stop everything ───────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (restartRef.current) { clearTimeout(restartRef.current); restartRef.current = null; }
    window.speechSynthesis.cancel();
    if (recRef.current) { recRef.current.abort(); recRef.current = null; }
  }, []);

  // ── API call ──────────────────────────────────────────────────────────────
  const callVaani = useCallback(async (userText: string, priorTurns: Turn[]) => {
    setPhase('thinking');
    const history = priorTurns
      .filter(t => t.role === 'user')
      .map(t => ({ role: 'user' as const, text: t.text }));

    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history }),
      });
      const data = await res.json() as { reply: string; risk: Risk; source: Source };

      const vaaniTurn: Turn = { role: 'vaani', text: data.reply, risk: data.risk, source: data.source };
      setLastRisk(data.risk);
      setTurns(prev => [...prev, vaaniTurn]);
      turnsRef.current = [...turnsRef.current, vaaniTurn];

      setPhase('speaking');
      speak(data.reply, () => {
        if (!autoRef.current) { setPhase('idle'); return; }
        // Guard: only restart if still open and not already stopped
        restartRef.current = setTimeout(() => {
          if (phaseRef.current === 'speaking' || phaseRef.current === 'idle') {
            startListening();
          }
        }, 500);
      });
    } catch {
      const errText = langRef.current === 'en'
        ? "Sorry, couldn't connect. Please try again."
        : "माफ करें, जुड़ नहीं पाई। कृपया दोबारा कोशिश करें।";
      setTurns(prev => [...prev, { role: 'vaani', text: errText }]);
      setPhase('idle');
    }
  // startListening defined below — accessed via ref to avoid circular dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]);

  // ── Start listening ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    // Abort any existing instance before creating a new one
    if (recRef.current) { recRef.current.abort(); recRef.current = null; }

    const W = window as unknown as Record<string, unknown>;
    const Ctor = (W.SpeechRecognition ?? W.webkitSpeechRecognition) as (new () => SpeechRec) | undefined;
    if (!Ctor) { setErrorMsg('Voice input not supported in this browser. Use Chrome.'); return; }

    window.speechSynthesis.cancel();
    capturedRef.current = '';          // reset session transcript
    const rec = new Ctor();
    rec.lang = 'hi-IN'; rec.continuous = false; rec.interimResults = true;
    recRef.current = rec;

    rec.onstart = () => { setPhase('listening'); setInterim(''); setErrorMsg(''); };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else                       interim += e.results[i][0].transcript;
      }
      if (final) capturedRef.current += final;     // accumulate into ref, not state
      setInterim(capturedRef.current || interim);  // show running transcript
    };

    rec.onend = () => {
      recRef.current = null;
      setInterim('');
      const transcript = capturedRef.current.trim();
      capturedRef.current = '';

      if (!transcript) { setPhase('idle'); return; }

      // Append user turn then call API with snapshot of current turns
      const userTurn: Turn = { role: 'user', text: transcript };
      const priorTurns = turnsRef.current;
      setTurns(prev => { const next = [...prev, userTurn]; turnsRef.current = next; return next; });
      callVaani(transcript, priorTurns);
    };

    rec.onerror = (e: { error: string }) => {
      recRef.current = null;
      if (e.error !== 'no-speech' && e.error !== 'aborted') setErrorMsg(`Mic error: ${e.error}`);
      setPhase('idle');
    };

    rec.start();
  }, [callVaani]);

  // ── Mic button handler ────────────────────────────────────────────────────
  const handleMicPress = () => {
    if (phase === 'listening') { if (recRef.current) recRef.current.stop(); return; }
    if (phase === 'speaking')  { stopAll(); setPhase('idle'); return; }
    startListening();
  };

  const handleReset = () => {
    stopAll();
    setTurns([]); turnsRef.current = [];
    setLastRisk(null); setPhase('idle'); setInterim(''); capturedRef.current = '';
  };

  // ── Cleanup on close / unmount ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) { stopAll(); setPhase('idle'); setInterim(''); capturedRef.current = ''; }
  }, [isOpen, stopAll]);

  useEffect(() => () => { stopAll(); }, [stopAll]);

  // ── Visuals ───────────────────────────────────────────────────────────────
  const riskColor = lastRisk ? RISK_COLOR[lastRisk] : '#3B8C5A';
  const phaseLabel: Record<Phase, string> = {
    idle:      lang === 'en' ? 'Tap mic to speak'   : 'बोलने के लिए टैप करें',
    listening: lang === 'en' ? 'Listening…'          : 'सुन रही हूँ…',
    thinking:  lang === 'en' ? 'Thinking…'           : 'सोच रही हूँ…',
    speaking:  lang === 'en' ? 'Vaani is speaking…'  : 'वाणी बोल रही है…',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: 'rgba(15,26,19,0.97)', backdropFilter: 'blur(12px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1F3A3D] flex items-center justify-center text-xl">🎙️</div>
              <div>
                <div className="text-white font-serif font-bold text-lg leading-tight">Vaani Voice Agent</div>
                <div className="text-white/40 text-[11px] font-mono">वाणी · Health Triage AI · hi-IN</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoMode(v => !v)}
                className={`text-[11px] font-mono px-2 py-1 rounded-full border transition-colors ${
                  autoMode ? 'border-[#3B8C5A] text-[#3B8C5A]' : 'border-white/20 text-white/40'
                }`}
                title="Toggle continuous conversation"
              >
                {autoMode ? '🔄 auto' : '⏸ manual'}
              </button>
              <button onClick={handleReset} className="text-white/40 hover:text-white text-sm px-2" title="Clear">↺</button>
              <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none ml-1" aria-label="Close voice agent">✕</button>
            </div>
          </div>

          {/* Risk banner */}
          <AnimatePresence>
            {lastRisk && (
              <motion.div
                key={lastRisk}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mx-5 mb-2 rounded-xl px-4 py-2 flex items-center gap-2 shrink-0"
                style={{ background: RISK_COLOR[lastRisk] + '22', borderLeft: `3px solid ${RISK_COLOR[lastRisk]}` }}
              >
                <span className="text-sm font-mono font-bold" style={{ color: RISK_COLOR[lastRisk] }}>
                  {RISK_LABEL[lastRisk]}
                </span>
                {lastRisk === 'RED' && (
                  <a href="tel:108" className="ml-auto text-[#B23A2E] font-bold text-sm underline">📞 108</a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-3 min-h-0">
            {turns.length === 0 && (
              <div className="text-center text-white/25 text-sm font-mono mt-8 leading-relaxed whitespace-pre-line">
                {lang === 'en'
                  ? 'Describe your symptoms in Hindi or English.\nVaani will assess the risk and advise you.'
                  : 'हिंदी या अंग्रेजी में अपने लक्षण बताएं।\nवाणी जोखिम का मूल्यांकन करेगी।'}
              </div>
            )}

            {turns.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  t.role === 'user'
                    ? 'bg-[#1F3A3D] text-white rounded-br-sm'
                    : 'bg-white/8 text-white/90 rounded-bl-sm border border-white/10'
                }`}>
                  {t.role === 'vaani' && <span className="text-[10px] text-white/30 font-mono block mb-1">वाणी</span>}
                  {t.text}
                </div>
                {t.risk && (
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mt-1"
                    style={{ background: RISK_COLOR[t.risk] + '33', color: RISK_COLOR[t.risk] }}
                  >
                    {RISK_LABEL[t.risk]}
                  </span>
                )}
                {t.source === 'demo' && (
                  <span className="text-[9px] text-white/20 font-mono mt-0.5">⚡ demo mode</span>
                )}
              </motion.div>
            ))}

            {/* Live interim transcript */}
            {interim && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-[#1F3A3D]/60 text-white/50 italic border border-white/10 rounded-br-sm">
                  {interim}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Controls */}
          <div className="shrink-0 px-5 pt-3 pb-8 flex flex-col items-center gap-4">
            <Waveform active={phase === 'listening' || phase === 'speaking'} color={riskColor} />
            <div className="text-white/40 text-[12px] font-mono h-4">{phaseLabel[phase]}</div>

            <motion.button
              onClick={handleMicPress}
              whileTap={{ scale: 0.93 }}
              animate={phase === 'listening'
                ? { boxShadow: [`0 0 0 0px ${riskColor}55`, `0 0 0 18px ${riskColor}00`] }
                : {}}
              transition={phase === 'listening' ? { repeat: Infinity, duration: 1.1 } : {}}
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-colors"
              style={{
                background: phase === 'listening' ? riskColor
                  : phase === 'speaking'           ? '#1F3A3D'
                  : phase === 'thinking'           ? '#C77B18'
                  :                                  '#1F3A3D',
                border: `2px solid ${riskColor}66`,
              }}
              disabled={phase === 'thinking'}
              aria-label={phase === 'listening' ? 'Stop listening' : phase === 'speaking' ? 'Stop speaking' : 'Start speaking'}
            >
              {phase === 'thinking'
                ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'block' }}>⟳</motion.span>
                : phase === 'speaking'  ? '🔊'
                : phase === 'listening' ? '⏹'
                : '🎤'}
            </motion.button>

            {errorMsg && <div className="text-[#B23A2E] text-[11px] font-mono text-center">{errorMsg}</div>}
            <div className="text-white/20 text-[10px] font-mono text-center">
              Not a doctor · Emergencies call 108 · ArogyaAI Indore
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
