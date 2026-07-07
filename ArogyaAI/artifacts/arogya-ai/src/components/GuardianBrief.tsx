import React, { useState } from 'react';
import { morningBrief } from '../data/demo-content';
import { motion, AnimatePresence } from 'framer-motion';

interface GuardianBriefProps {
  onDismiss: () => void;
}

export function GuardianBrief({ onDismiss }: GuardianBriefProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="bg-[#1F3A3D] text-white rounded-2xl overflow-hidden shadow-lg border border-[#1F3A3D]/60 mb-6"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#E0952B] animate-pulse"></div>
          <span className="text-xs font-mono text-white/60 uppercase tracking-widest">ArogyaAI Guardian</span>
          <span className="text-xs font-mono text-white/40">· {morningBrief.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-white/50 hover:text-white/80 transition-colors font-mono"
          >
            {expanded ? "collapse ▲" : "expand ▼"}
          </button>
          <button onClick={onDismiss} className="text-white/40 hover:text-white/70 ml-2 text-sm leading-none">✕</button>
        </div>
      </div>

      {/* Headline */}
      <div className="px-5 py-4">
        <div className="font-serif text-xl font-bold mb-3">
          🌅 Good Morning, Indore.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat
            icon="🦟"
            value={`${morningBrief.hotspots.length} hotspots`}
            label="disease clusters detected"
            color="#E0952B"
          />
          <Stat
            icon="🏥"
            value={`${morningBrief.icuAlert.length} hospitals`}
            label="nearing ICU capacity"
            color="#B23A2E"
          />
          <Stat
            icon="💊"
            value="1 ward"
            label={`medicine shortage risk`}
            color="#C77B18"
          />
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="px-5 py-4 grid sm:grid-cols-3 gap-6 text-sm">
              {/* Hotspots */}
              <div>
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest mb-3">Disease Hotspots</div>
                <div className="space-y-2">
                  {morningBrief.hotspots.map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <div>
                        <div className="font-bold text-white">{h.area}</div>
                        <div className="text-xs text-white/50 capitalize">{h.disease}</div>
                      </div>
                      <div className="text-[#E0952B] font-mono font-bold">{h.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ICU Alerts */}
              <div>
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest mb-3">ICU Load</div>
                <div className="space-y-3">
                  {morningBrief.icuAlert.map((h, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/80">{h.hospital}</span>
                        <span className={`font-mono font-bold ${h.pct >= 80 ? 'text-[#B23A2E]' : 'text-[#E0952B]'}`}>{h.pct}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${h.pct >= 80 ? 'bg-[#B23A2E]' : 'bg-[#E0952B]'}`}
                          style={{ width: `${h.pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <div className="text-xs font-mono text-white/50 uppercase tracking-widest mb-3">Today's Actions</div>
                <div className="space-y-2 text-xs text-white/70">
                  <div className="flex gap-2"><span className="text-[#E0952B]">→</span> Deploy fogging teams to Palasia & Banganga</div>
                  <div className="flex gap-2"><span className="text-[#B23A2E]">→</span> Divert non-trauma cases from MY Hospital</div>
                  <div className="flex gap-2"><span className="text-[#C77B18]">→</span> Emergency Metformin transfer to Sudama Nagar PHC</div>
                  <div className="flex gap-2"><span className="text-[#3B8C5A]">→</span> {morningBrief.diseaseTrend}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Stat({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="font-bold text-base" style={{ color }}>{value}</div>
        <div className="text-xs text-white/50">{label}</div>
      </div>
    </div>
  );
}
