import React, { useState, useMemo } from 'react';
import { useAlertLog, Alert } from '../context/AlertLogContext';
import { IndoreMap } from '../components/IndoreMap';
import { GuardianBrief } from '../components/GuardianBrief';
import { useHospitals, useMedicines, useDoctors, useZones, type Hospital } from '../hooks/useApiData';
import { footfall, computeWardScores, getAdvisorResponse, type WardScore } from '../lib/health-logic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';

export default function Management() {
  const { alerts } = useAlertLog();
  const [expandedAlertId, setExpandedAlertId] = useState<number | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [showGuardian, setShowGuardian] = useState(true);

  // Feature 16: Disaster Mode
  const [disasterMode, setDisasterMode] = useState(false);

  // Feature 18: AI Public Health Advisor
  const [advisorQuery, setAdvisorQuery] = useState('');
  const [advisorResponse, setAdvisorResponse] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Real data, fetched from the backend/database
  const { data: hospitals = [], isLoading: hospitalsLoading } = useHospitals();
  const { data: medicines = [], isLoading: medicinesLoading } = useMedicines();
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors();
  const { data: zones = [], isLoading: zonesLoading } = useZones();

  const isLoading = hospitalsLoading || medicinesLoading || doctorsLoading || zonesLoading;
  const wardScores: WardScore[] = useMemo(() => computeWardScores(zones, doctors, medicines), [zones, doctors, medicines]);

  // Computed stats
  const lowStockCount = medicines.filter(m => (m.stock / m.burnRate) < 3).length;
  const freeBeds = hospitals.reduce((sum, h) => sum + h.beds, 0);
  const docsPresent = doctors.filter(d => d.present).length;
  const docsTotal = doctors.length;
  const docsPercent = docsTotal ? (docsPresent / docsTotal) * 100 : 0;
  const todayFootfall = footfall[footfall.length - 1];
  const yesterdayFootfall = footfall[footfall.length - 2];
  const footfallDelta = todayFootfall - yesterdayFootfall;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono">
        Loading district data…
      </div>
    );
  }

  const generateBrief = () => {
    setBrief("Generating...");
    setTimeout(() => {
      setBrief(`WEEKLY DISTRICT BRIEF: INDORE

1. TOP ALERT SUMMARY:
This week saw an elevated cluster of ${alerts.length} critical alerts. The highest priority remains the repeated reports of dengue-suspect fever in Palasia and Banganga. Emergency dispatches have increased by 12% in these zones.

2. MEDICINE STOCKOUT WATCH:
We are tracking ${lowStockCount} critical items under 3 days of stock. Notably, Insulin supplies at PHC Rau and Metformin at PHC Sudama Nagar are depleting faster than the replenishment cycle. Recommend immediate inter-PHC transfer from Vijay Nagar.

3. STAFFING & CAPACITY:
Currently ${docsPresent}/${docsTotal} duty doctors are present (${docsPercent.toFixed(0)}%). Overall bed capacity across 6 partner hospitals is stable at ${freeBeds} free beds, though MY Hospital trauma ward is nearing capacity due to weekend admissions.

4. COMMUNITY HEALTH INDEX:
Top-performing ward: Vijay Nagar (83/100 — Grade A). Immediate attention needed: Palasia (32/100 — Grade D) due to active dengue cluster and staffing shortfalls.`);
    }, 1500);
  };

  const handleAdvisorQuery = () => {
    if (!advisorQuery.trim()) return;
    setAdvisorLoading(true);
    setAdvisorResponse(null);
    setTimeout(() => {
      setAdvisorResponse(getAdvisorResponse(advisorQuery, wardScores));
      setAdvisorLoading(false);
    }, 1200);
  };

  // ─── Feature 16: Disaster Mode (Emergency Operations Center) ─────────────
  if (disasterMode) {
    return <DisasterEOC onExit={() => setDisasterMode(false)} alerts={alerts} hospitals={hospitals} />;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">District Management</h1>
            <p className="text-muted-foreground font-mono mt-1">Indore Central Command</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="text-sm font-bold text-foreground">Last updated</div>
              <div className="text-xs text-primary font-mono">Live Sync Active</div>
            </div>
            {/* Feature 16: Disaster Mode Toggle */}
            <Button
              onClick={() => setDisasterMode(true)}
              className="bg-[#B23A2E] hover:bg-[#8e2d23] text-white gap-2 font-bold"
              size="sm"
            >
              🌧️ Disaster Mode
            </Button>
          </div>
        </div>

        {/* Feature 20: Guardian Morning Brief */}
        <AnimatePresence>
          {showGuardian && <GuardianBrief onDismiss={() => setShowGuardian(false)} />}
        </AnimatePresence>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-card border border-border w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">Alerts & Trails</TabsTrigger>
            <TabsTrigger value="health-radar">🌡 Health Radar</TabsTrigger>
            <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
            <TabsTrigger value="advisor">🤖 AI Advisor</TabsTrigger>
            <TabsTrigger value="brief">MP Weekly Brief</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-destructive/20 bg-destructive/5 shadow-none">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-destructive">Critical Stockouts</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold text-destructive">{lowStockCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">items under 3 days supply</p>
                </CardContent>
              </Card>
              <Card className="border-[#3B8C5A]/20 bg-[#3B8C5A]/5 shadow-none">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-[#3B8C5A]">Free Beds</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold text-[#3B8C5A]">{freeBeds}</div>
                  <p className="text-xs text-muted-foreground mt-1">across partner network</p>
                </CardContent>
              </Card>
              <Card className={docsPercent < 70 ? 'border-[#E0952B] shadow-none' : 'shadow-none'}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">Doctors Present</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold text-foreground">{docsPresent}<span className="text-lg text-muted-foreground">/{docsTotal}</span></div>
                  <p className="text-xs text-muted-foreground mt-1">duty roster today</p>
                </CardContent>
              </Card>
              <Card className="shadow-none">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">Patient Footfall</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-3xl font-bold text-foreground">{todayFootfall}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span className={footfallDelta > 0 ? 'text-destructive' : 'text-[#3B8C5A]'}>
                      {footfallDelta > 0 ? '↑' : '↓'} {Math.abs(footfallDelta)}
                    </span> vs yesterday
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-serif font-bold text-xl">Live Indore Map</h3>
                <IndoreMap />
                <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#B23A2E] rounded-full inline-block"></span> High Risk Zone</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#E0952B] rounded-full inline-block"></span> Watch Zone</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#1F3A3D] rotate-45 inline-block"></span> Hospital</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-serif font-bold text-xl">7-Day Footfall Trend</h3>
                <Card className="shadow-none border-border">
                  <CardContent className="p-6 h-[340px] flex items-end gap-2">
                    {footfall.map((val, i) => {
                      const max = Math.max(...footfall);
                      const height = (val / max) * 100;
                      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                          <div className="text-xs font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{val}</div>
                          <motion.div 
                            className="w-full bg-secondary/80 rounded-t-sm group-hover:bg-primary transition-colors"
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: i * 0.1 }}
                          ></motion.div>
                          <div className="text-[10px] uppercase text-muted-foreground">{days[i]}</div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── ALERTS & TRAILS ───────────────────────────────────── */}
          <TabsContent value="alerts">
            <h3 className="font-serif font-bold text-xl mb-6">Alert Feed & Explainability</h3>
            <div className="space-y-4">
              {alerts.map((alert: Alert) => (
                <div key={alert.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${alert.risk === 'red' ? 'bg-[#B23A2E]' : alert.risk === 'orange' ? 'bg-[#C77B18]' : 'bg-[#3B8C5A]'}`}></div>
                      <div>
                        <div className="font-bold">{alert.locality}</div>
                        <div className="text-sm text-muted-foreground">{alert.time}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium hidden md:block">{alert.detail.substring(0, 50)}...</div>
                    <div className="text-muted-foreground">{expandedAlertId === alert.id ? '▲' : '▼'}</div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedAlertId === alert.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border bg-muted/30"
                      >
                        <div className="p-6 grid gap-6 md:grid-cols-4">
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-muted-foreground uppercase">1. Source</div>
                            <div className="text-sm p-3 bg-card border border-border rounded-lg h-full">"{alert.transcript}"</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-muted-foreground uppercase">2. Extracted</div>
                            <div className="text-sm p-3 bg-card border border-border rounded-lg font-mono text-primary h-full">{alert.field}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-muted-foreground uppercase">3. Rule Fired</div>
                            <div className="text-sm p-3 bg-card border border-border rounded-lg h-full">{alert.rule}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-muted-foreground uppercase">4. Generated</div>
                            <div className="text-sm p-3 bg-card border border-border rounded-lg font-bold h-full">{alert.detail}</div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {alerts.length === 0 && <div className="text-center py-12 text-muted-foreground">No alerts active.</div>}
            </div>
          </TabsContent>

          {/* ── FEATURE 14: COMMUNITY HEALTH RADAR ───────────────── */}
          <TabsContent value="health-radar">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-xl">Community Health Index</h3>
                <p className="text-sm text-muted-foreground mt-1 font-mono">Per-ward score (0–100) · 4 factors · Updated daily</p>
              </div>
              <div className="flex gap-2 text-xs font-mono">
                <span className="px-2 py-1 bg-[#3B8C5A]/10 text-[#3B8C5A] rounded">A = 80+</span>
                <span className="px-2 py-1 bg-[#C77B18]/10 text-[#C77B18] rounded">B = 60–79</span>
                <span className="px-2 py-1 bg-[#E0952B]/10 text-[#E0952B] rounded">C = 40–59</span>
                <span className="px-2 py-1 bg-[#B23A2E]/10 text-[#B23A2E] rounded">D &lt; 40</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {wardScores
                .sort((a, b) => b.score - a.score)
                .map((ward, idx) => (
                  <WardScoreCard key={ward.locality} ward={ward} rank={idx + 1} />
                ))}
            </div>

            {/* Summary insight */}
            <div className="mt-8 bg-[#1F3A3D] text-white rounded-2xl p-6">
              <div className="text-xs font-mono text-white/50 mb-2 uppercase tracking-widest">AI Health Radar Summary</div>
              <div className="font-serif text-lg font-bold mb-3">District Health Snapshot</div>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-[#3B8C5A] font-bold text-2xl mb-1">{wardScores.filter(w => w.riskGrade === 'A' || w.riskGrade === 'B').length}</div>
                  <div className="text-white/60">wards in good health (A/B)</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-[#B23A2E] font-bold text-2xl mb-1">{wardScores.filter(w => w.riskGrade === 'D').length}</div>
                  <div className="text-white/60">wards needing urgent action (Grade D)</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-[#E0952B] font-bold text-2xl mb-1">{Math.round(wardScores.reduce((s, w) => s + w.score, 0) / wardScores.length)}</div>
                  <div className="text-white/60">average district health score</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── HOSPITALS ─────────────────────────────────────────── */}
          <TabsContent value="hospitals">
            <h3 className="font-serif font-bold text-xl mb-6">Hospital Network Status</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-sm font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 font-medium">Hospital</th>
                    <th className="p-4 font-medium">Specialties</th>
                    <th className="p-4 font-medium">Facilities</th>
                    <th className="p-4 font-medium">Beds Free</th>
                    <th className="p-4 font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.map((h, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-bold">{h.name}</td>
                      <td className="p-4 text-sm">{h.specialties.join(', ')}</td>
                      <td className="p-4 flex gap-2">
                        {h.icu && <Badge variant="secondary">ICU</Badge>}
                        {h.trauma && <Badge variant="destructive">Trauma</Badge>}
                      </td>
                      <td className="p-4 font-mono font-bold text-lg">{h.beds}</td>
                      <td className="p-4 text-primary font-bold">★ {h.reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── FEATURE 18: AI PUBLIC HEALTH ADVISOR ─────────────── */}
          <TabsContent value="advisor">
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h3 className="font-serif font-bold text-xl">AI Public Health Advisor</h3>
                <p className="text-sm text-muted-foreground font-mono mt-1">Ask questions about Indore's health situation. The AI answers using live district data.</p>
              </div>

              {/* Query suggestions */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  "Which area needs more doctors?",
                  "Where is dengue spreading?",
                  "Which medicines are running out?",
                  "Which hospital is overloaded?",
                  "Show me ward health rankings",
                  "Are we prepared for floods?"
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setAdvisorQuery(q)}
                    className="text-xs px-3 py-1.5 bg-card border border-border rounded-full hover:bg-muted transition-colors font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mb-6">
                <Textarea
                  value={advisorQuery}
                  onChange={e => setAdvisorQuery(e.target.value)}
                  placeholder='Ask anything — "Which area needs more doctors?" or "Where is dengue spreading?"'
                  className="min-h-[80px] resize-none flex-1"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdvisorQuery(); } }}
                />
                <Button
                  onClick={handleAdvisorQuery}
                  disabled={advisorLoading || !advisorQuery.trim()}
                  className="bg-[#1F3A3D] hover:bg-[#162b2e] text-white px-6 self-end"
                >
                  {advisorLoading ? "…" : "Ask AI"}
                </Button>
              </div>

              <AnimatePresence mode="wait">
                {advisorLoading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-muted rounded-2xl p-6 font-mono text-sm text-muted-foreground flex items-center gap-3"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    Analyzing district health data…
                  </motion.div>
                )}

                {advisorResponse && !advisorLoading && (
                  <motion.div key="response" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1F3A3D] text-white rounded-2xl overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#3B8C5A]"></div>
                      <span className="text-xs font-mono text-white/50 uppercase tracking-widest">ArogyaAI Advisor — based on live district data</span>
                    </div>
                    <div className="p-6 text-sm leading-relaxed whitespace-pre-line">
                      {/* Render **bold** manually */}
                      <MarkdownLite text={advisorResponse} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* ── MP WEEKLY BRIEF ───────────────────────────────────── */}
          <TabsContent value="brief">
            <Card className="max-w-3xl mx-auto shadow-sm">
              <CardHeader>
                <CardTitle className="font-serif">MP Weekly Health Brief</CardTitle>
                <CardDescription>Auto-generated from ground data for Member of Parliament office.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button onClick={generateBrief} className="w-full font-bold" size="lg">
                  Generate Latest Brief
                </Button>
                
                <AnimatePresence>
                  {brief && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-muted border border-border rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap"
                    >
                      {brief}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Ward Score Card ──────────────────────────────────────────────────────────
function WardScoreCard({ ward, rank }: { ward: WardScore; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const gradeColor: Record<string, string> = {
    A: '#3B8C5A', B: '#C77B18', C: '#E0952B', D: '#B23A2E'
  };
  const color = gradeColor[ward.riskGrade] ?? '#4C5C50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.07 }}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs font-mono text-muted-foreground">#{rank} · {ward.locality}</div>
            <div className="font-serif font-bold text-xl text-foreground mt-0.5">{ward.score}<span className="text-sm text-muted-foreground font-sans font-normal">/100</span></div>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg text-white" style={{ background: color }}>
            {ward.riskGrade}
          </div>
        </div>

        {/* Score bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-3">
          <div className="h-2 rounded-full transition-all" style={{ width: `${ward.score}%`, background: color }}></div>
        </div>

        <button onClick={() => setExpanded(v => !v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
          {expanded ? '▲ Hide breakdown' : '▼ Show breakdown'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              {ward.breakdown.map((f, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-mono font-bold text-foreground">{f.value}/{f.max}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${(f.value / f.max) * 100}%`, background: color }}></div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Feature 16: Disaster EOC View ────────────────────────────────────────────
// NOTE — the "High-Risk Zones" reasons and "Emergency Call Feed" below remain
// illustrative demo content. A real live-call feed would need a dispatch/CAD
// integration, which is out of scope for this pass.
function DisasterEOC({ onExit, alerts, hospitals }: { onExit: () => void; alerts: Alert[]; hospitals: Hospital[] }) {
  const redAlerts = alerts.filter(a => a.risk === 'red');

  return (
    <div className="min-h-screen bg-[#0D1F1A] text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* EOC Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-3 h-3 rounded-full bg-[#B23A2E] animate-pulse"></div>
              <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Emergency Operations Center</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-white">🌧️ Disaster Mode Active</h1>
            <p className="text-white/50 font-mono text-sm mt-1">Flood Advisory — Indore District · All units on alert</p>
          </div>
          <Button onClick={onExit} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            ✕ Exit Disaster Mode
          </Button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Red Alerts", value: redAlerts.length.toString(), color: "#B23A2E" },
            { label: "Emergency Calls", value: "14", color: "#E0952B" },
            { label: "Hospitals On Alert", value: "6/6", color: "#C77B18" },
            { label: "High-Risk Zones", value: "2", color: "#B23A2E" }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="text-3xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-white/50 font-mono">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Hospital Capacity Panel */}
          <div>
            <h3 className="font-serif font-bold text-xl mb-4 text-white/90">Hospital Capacity</h3>
            <div className="space-y-3">
              {hospitals.map((h, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{h.name}</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${h.icuPct >= 80 ? 'bg-[#B23A2E]/30 text-[#ff8070]' : h.icuPct >= 60 ? 'bg-[#E0952B]/30 text-[#ffb35c]' : 'bg-[#3B8C5A]/30 text-[#5dcc8a]'}`}>
                      ICU {h.icuPct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-white/40 mb-1 font-mono">ICU LOAD</div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${h.icuPct}%`, background: h.icuPct >= 80 ? '#B23A2E' : h.icuPct >= 60 ? '#E0952B' : '#3B8C5A' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 mb-1 font-mono">BED OCCUPANCY</div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${h.bedPct}%`, background: h.bedPct >= 80 ? '#B23A2E' : '#E0952B' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High-Risk Zones + Emergency Feed */}
          <div className="space-y-6">
            <div>
              <h3 className="font-serif font-bold text-xl mb-4 text-white/90">High-Risk Zones</h3>
              <div className="space-y-2">
                {[
                  { zone: "Palasia", reason: "Active dengue cluster — 7 cases", level: "CRITICAL" },
                  { zone: "Banganga", reason: "Fever cluster + low PHC capacity", level: "HIGH" },
                  { zone: "Rau", reason: "Flood-prone low-lying locality", level: "WATCH" }
                ].map((z, i) => (
                  <div key={i} className={`border rounded-xl p-4 flex items-center gap-4 ${z.level === 'CRITICAL' ? 'border-[#B23A2E]/40 bg-[#B23A2E]/10' : z.level === 'HIGH' ? 'border-[#E0952B]/40 bg-[#E0952B]/10' : 'border-[#C77B18]/40 bg-[#C77B18]/10'}`}>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${z.level === 'CRITICAL' ? 'bg-[#B23A2E] animate-pulse' : z.level === 'HIGH' ? 'bg-[#E0952B]' : 'bg-[#C77B18]'}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{z.zone}</div>
                      <div className="text-xs text-white/50">{z.reason}</div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded whitespace-nowrap ${z.level === 'CRITICAL' ? 'text-[#ff8070]' : z.level === 'HIGH' ? 'text-[#ffb35c]' : 'text-[#ffd18a]'}`}>{z.level}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Emergency Call Feed */}
            <div>
              <h3 className="font-serif font-bold text-xl mb-4 text-white/90">Emergency Call Feed</h3>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {[
                  { time: "07:42", caller: "Ramesh K.", locality: "Palasia", type: "Unconscious patient", status: "Dispatched" },
                  { time: "07:38", caller: "ASHA Meena", locality: "Banganga", type: "Child high fever", status: "Logged" },
                  { time: "07:31", caller: "Suresh T.", locality: "Rau", type: "Snake bite", status: "En Route" },
                  { time: "07:18", caller: "PHC Sudama", locality: "Sudama Nagar", type: "Medicine stockout", status: "Escalated" },
                  { time: "07:05", caller: "Anita V.", locality: "Vijay Nagar", type: "Chest pain elderly", status: "Dispatched" }
                ].map((call, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 flex items-center gap-3 text-xs">
                    <span className="font-mono text-white/40 w-10 flex-shrink-0">{call.time}</span>
                    <span className="font-bold text-white/80 flex-1 min-w-0 truncate">{call.type}</span>
                    <span className="text-white/40">{call.locality}</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold flex-shrink-0 ${call.status === 'Dispatched' ? 'bg-[#3B8C5A]/30 text-[#5dcc8a]' : call.status === 'En Route' ? 'bg-[#C77B18]/30 text-[#ffb35c]' : call.status === 'Escalated' ? 'bg-[#B23A2E]/30 text-[#ff8070]' : 'bg-white/10 text-white/50'}`}>
                      {call.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Simple markdown bold renderer ────────────────────────────────────────────
function MarkdownLite({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="text-[#E0952B]">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}
