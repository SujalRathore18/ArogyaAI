/**
 * Pure, stateless health/triage logic used across the app.
 * These are deterministic scoring/classification functions — not data —
 * so they stay client-side and take real data (fetched from the API) as input.
 */
import type { Hospital, Zone, Doctor, Medicine } from '../hooks/useApiData';

export const INDORE_CENTER: [number, number] = [22.7196, 75.8577];

export function haversineKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function classifyRisk(text: string): 'RED' | 'YELLOW' | 'GREEN' {
  const redWords = ["chest pain", "breath", "साँस", "sans", "snake", "साँप", "unconscious", "behosh", "बेहोश", "bleeding", "खून", "seizure", "stroke"];
  const yellowWords = ["fever", "bukhar", "बुखार", "cough", "khansi", "खांसी", "vomit", "उल्टी", "pain", "दर्द", "typhoid", "dengue", "डेंगू"];
  const lowerText = text.toLowerCase();
  if (redWords.some(w => lowerText.includes(w))) return "RED";
  if (yellowWords.some(w => lowerText.includes(w))) return "YELLOW";
  return "GREEN";
}

export function calculateHospitalScore(hospital: Hospital, patientLoc: [number, number], needCardiac: boolean = false) {
  const dist = haversineKm(patientLoc, [hospital.lat, hospital.lng]);
  const score = (hospital.icu ? 2 : 0) + (hospital.trauma ? 1.5 : 0) + (needCardiac && hospital.cardiac ? 2 : 0) + (hospital.beds * 0.2) - (dist * 0.3);
  return { ...hospital, dist, score };
}

export interface ConsistencyResult {
  score: number;
  flags: string[];
  verdict: "Consistent" | "Minor Discrepancy" | "Flagged";
}

export function checkSymptomConsistency(text: string, risk: string): ConsistencyResult {
  const lower = text.toLowerCase();
  const flags: string[] = [];
  let deductions = 0;

  if (risk === "RED") {
    if (lower.includes("thoda") || lower.includes("थोड़ा") || lower.includes("slight") || lower.includes("mild")) {
      flags.push("Severity language inconsistent — critical risk stated but 'mild' qualifier found");
      deductions += 25;
    }
  }
  if ((lower.includes("dengue") || lower.includes("डेंगू")) && !lower.includes("rash") && !lower.includes("fever") && !lower.includes("बुखार")) {
    flags.push("Dengue mentioned without supporting fever/rash symptoms");
    deductions += 20;
  }
  if ((lower.includes("snake") || lower.includes("साँप")) && lower.includes("pain") && !lower.includes("bite") && !lower.includes("काट")) {
    flags.push("Snake incident reported — no bite confirmation; may be fear response");
    deductions += 10;
  }
  if (risk === "RED" && text.trim().split(" ").length < 5) {
    flags.push("Emergency claim with very limited symptom detail — needs clarification call");
    deductions += 20;
  }

  const score = Math.max(0, 100 - deductions);
  const verdict: ConsistencyResult["verdict"] = score >= 80 ? "Consistent" : score >= 55 ? "Minor Discrepancy" : "Flagged";
  return { score, flags, verdict };
}

export interface WardScore {
  locality: string;
  score: number;
  riskGrade: "A" | "B" | "C" | "D";
  breakdown: { label: string; value: number; max: number }[];
}

/** Computes a 0-100 community health score per zone from real, fetched data. */
export function computeWardScores(zones: Zone[], doctors: Doctor[], medicines: Medicine[]): WardScore[] {
  const riskMap: Record<string, number> = { blue: 40, orange: 22, red: 8 };

  return zones.map(zone => {
    const riskScore = riskMap[zone.risk] ?? 20;

    const phcKey = `PHC ${zone.locality}`;
    const phcDoctors = doctors.filter(d => d.phc === phcKey);
    const present = phcDoctors.filter(d => d.present).length;
    const docScore = phcDoctors.length ? Math.round((present / phcDoctors.length) * 30) : 20;

    const phcMeds = medicines.filter(m => m.phc === phcKey);
    const avgDays = phcMeds.length
      ? phcMeds.reduce((s, m) => s + m.stock / m.burnRate, 0) / phcMeds.length
      : 5;
    const medScore = Math.min(20, Math.round((avgDays / 7) * 20));

    const alertBonus = zone.risk === 'red' ? 2 : zone.risk === 'orange' ? 6 : 10;

    const total = riskScore + docScore + medScore + alertBonus;
    const grade: WardScore["riskGrade"] = total >= 80 ? "A" : total >= 60 ? "B" : total >= 40 ? "C" : "D";

    return {
      locality: zone.locality,
      score: total,
      riskGrade: grade,
      breakdown: [
        { label: "Zone Safety", value: riskScore, max: 40 },
        { label: "Doctors On-Duty", value: docScore, max: 30 },
        { label: "Medicine Stock", value: medScore, max: 20 },
        { label: "Alert Density", value: alertBonus, max: 10 },
      ],
    };
  });
}

/** Canned knowledge base for the AI Advisor demo — the ward-ranking answer is computed live. */
export interface AdvisorQuery {
  keywords: string[];
  answer: string;
}

export const advisorKnowledge: AdvisorQuery[] = [
  { keywords: ["more doctors", "doctor shortage", "doctor", "staff", "staffing"],
    answer: "Based on current attendance data, staffing is uneven across PHCs. Recommend reviewing the Health Radar tab for the wards with the lowest 'Doctors On-Duty' score and prioritizing coverage there." },
  { keywords: ["dengue", "mosquito", "vector", "fever cluster"],
    answer: "Check the Alerts & Trails tab for active fever/dengue-suspect clusters. Recommend fogging operations and ORS distribution in any zone flagged red or orange." },
  { keywords: ["medicine", "stock", "shortage", "drugs", "supply"],
    answer: "See the Hospitals tab for live medicine stock levels. Any item with fewer than 3 days of supply should be flagged for emergency inter-PHC transfer." },
  { keywords: ["hospital", "capacity", "bed", "icu", "overload"],
    answer: "See the Hospitals tab for live bed and ICU capacity per hospital. Divert non-critical cases away from any hospital above 80% ICU occupancy." },
  { keywords: ["flood", "disaster", "emergency", "crisis", "epidemic", "outbreak"],
    answer: "No active disaster declaration by default. Use Disaster Mode for a real-time Emergency Operations Center view once a crisis is declared." },
];

export function getAdvisorResponse(query: string, wardScores: WardScore[]): string {
  const lower = query.toLowerCase();
  const isWardQuery = ["ward", "best", "worst", "rank", "score", "health index"].some(k => lower.includes(k));
  if (isWardQuery) {
    const scores = [...wardScores].sort((a, b) => b.score - a.score);
    const lines = scores.map((w, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i === 3 ? "⚠️" : "🚨";
      return `${medal} **${w.locality}** — Score ${w.score}/100 (Grade ${w.riskGrade})`;
    });
    return `Community Health Index Rankings:\n${lines.join('\n')}\n\nLowest-scoring wards need immediate resource deployment. Grade D wards should be escalated to CMO.`;
  }
  for (const item of advisorKnowledge) {
    if (item.keywords.some(k => lower.includes(k))) return item.answer;
  }
  return "I don't have specific data on that query yet. Try asking about: **doctor shortages**, **medicine stock**, **dengue clusters**, **hospital capacity**, or **ward health scores**.";
}

/**
 * NOTE — demo-only placeholder data:
 * Patient footfall trends require a real visits/analytics table, which is out of
 * scope for this pass. This weekly array remains a static illustration for the
 * dashboard chart until that table + tracking exists.
 */
export const footfall = [112, 98, 134, 145, 108, 167, 141]; // Mon-Sun
