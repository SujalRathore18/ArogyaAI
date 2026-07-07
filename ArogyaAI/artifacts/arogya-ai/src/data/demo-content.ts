/**
 * DEMO-ONLY CONTENT — clearly out of scope for this pass, kept as static
 * illustrative content rather than faked as real backend data:
 *
 * - `morningBrief`: a real version needs a scheduled job that aggregates
 *   overnight alerts/ICU data and runs it through an LLM summarizer.
 * - `userProfile`: a real version needs a patient medical-profile table
 *   with proper consent/access-control handling (this is sensitive health
 *   data) — not something to bolt on without a real auth+consent design.
 *
 * Both are flagged here so they're easy to find and replace later.
 */

export const morningBrief = {
  date: "Monday, July 7 — 07:00 AM",
  hotspots: [
    { area: "Palasia", disease: "dengue cluster", count: 7 },
    { area: "Banganga", disease: "fever cluster", count: 5 },
    { area: "Sudama Nagar", disease: "malaria suspect", count: 3 },
  ],
  icuAlert: [
    { hospital: "MY Hospital (MGM)", pct: 87 },
    { hospital: "Medanta Indore", pct: 79 },
  ],
  medicineRisk: "Sudama Nagar (Metformin — 1.75 days left)",
  diseaseTrend: "+18% respiratory cases vs last week",
};

export const userProfile = {
  name: "Rahul Mehta",
  age: 34,
  bloodGroup: "B+",
  locality: "Banganga, Indore",
  allergies: ["Penicillin", "Aspirin"],
  chronicDiseases: ["Type 2 Diabetes", "Hypertension"],
  emergencyContacts: [
    { name: "Sunita Mehta (Wife)", phone: "9876543210" },
    { name: "Dr. Arjun Mehta (Son)", phone: "9812345678" },
  ],
  abhaId: "27-1234-5678-9012",
};
