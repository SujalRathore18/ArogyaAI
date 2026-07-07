/**
 * Seeds the database with demo data for the ArogyaAI prototype.
 * Run with: pnpm --filter @workspace/db run seed
 */
import { db, pool } from "./index";
import {
  hospitalsTable,
  medicinesTable,
  doctorsTable,
  zonesTable,
  alertsTable,
} from "./schema";

async function seed() {
  console.log("Seeding database...");

  await db.delete(alertsTable);
  await db.delete(doctorsTable);
  await db.delete(medicinesTable);
  await db.delete(hospitalsTable);
  await db.delete(zonesTable);

  await db.insert(zonesTable).values([
    { locality: "Banganga", lat: 22.7421, lng: 75.8823, risk: "orange" },
    { locality: "Rau", lat: 22.6819, lng: 75.7767, risk: "blue" },
    { locality: "Vijay Nagar", lat: 22.7533, lng: 75.8937, risk: "blue" },
    { locality: "Palasia", lat: 22.7238, lng: 75.8717, risk: "red" },
    { locality: "Sudama Nagar", lat: 22.7063, lng: 75.8389, risk: "orange" },
  ]);

  await db.insert(hospitalsTable).values([
    { name: "MY Hospital (MGM)", lat: 22.7183, lng: 75.8602, specialties: ["Trauma", "ICU", "General"], icu: true, trauma: true, cardiac: false, beds: 34, reviews: 4.1, icuPct: 87, bedPct: 74 },
    { name: "Bombay Hospital", lat: 22.7199, lng: 75.8865, specialties: ["Cardiac", "ICU", "Ortho"], icu: true, trauma: false, cardiac: true, beds: 22, reviews: 4.4, icuPct: 54, bedPct: 61 },
    { name: "CHL Apollo", lat: 22.7267, lng: 75.8836, specialties: ["Cardiac", "Neuro", "ICU"], icu: true, trauma: false, cardiac: true, beds: 18, reviews: 4.2, icuPct: 68, bedPct: 55 },
    { name: "Medanta Indore", lat: 22.7563, lng: 75.9047, specialties: ["Multi-specialty", "ICU"], icu: true, trauma: true, cardiac: true, beds: 41, reviews: 4.5, icuPct: 79, bedPct: 83 },
    { name: "Kokilaben (KIMS)", lat: 22.7387, lng: 75.9112, specialties: ["General", "Maternity"], icu: false, trauma: false, cardiac: false, beds: 15, reviews: 3.9, icuPct: 45, bedPct: 48 },
    { name: "Vishesh Jupiter", lat: 22.7083, lng: 75.8778, specialties: ["Ortho", "General"], icu: false, trauma: true, cardiac: false, beds: 28, reviews: 4.0, icuPct: 30, bedPct: 42 },
  ]);

  await db.insert(medicinesTable).values([
    { name: "Insulin", stock: 18, burnRate: 6, phc: "PHC Rau" },
    { name: "ORS Sachets", stock: 210, burnRate: 35, phc: "PHC Banganga" },
    { name: "Paracetamol", stock: 580, burnRate: 60, phc: "PHC Palasia" },
    { name: "Metformin", stock: 14, burnRate: 8, phc: "PHC Sudama Nagar" },
    { name: "Amoxicillin", stock: 96, burnRate: 18, phc: "PHC Vijay Nagar" },
  ]);

  await db.insert(doctorsTable).values([
    { name: "Dr. Priya Sharma", specialty: "General Medicine", phc: "PHC Vijay Nagar", present: true },
    { name: "Dr. Arvind Malhotra", specialty: "Pediatrics", phc: "PHC Banganga", present: true },
    { name: "Dr. Sunita Patel", specialty: "Gynecology", phc: "PHC Palasia", present: false },
    { name: "Dr. Rohit Joshi", specialty: "General Medicine", phc: "PHC Rau", present: true },
    { name: "Dr. Kavita Singh", specialty: "AYUSH", phc: "PHC Sudama Nagar", present: false },
  ]);

  await db.insert(alertsTable).values([
    {
      locality: "Banganga",
      rule: "Cluster rule: 5 reports in 3 days",
      detail: "5th dengue-suspect fever report in Banganga this week — threshold crossed at report #5.",
      transcript: "ASHA report: fever, body ache, rash — 3rd day, child patient.",
      field: "symptoms: fever, rash · severity: moderate",
      risk: "yellow",
    },
    {
      locality: "Rau",
      rule: "Stockout formula: days left = stock ÷ burn",
      detail: "Insulin at PHC Rau: 18 vials ÷ 6/day burn = 3 days left.",
      transcript: "Auto-generated from daily stock log, not a phone report.",
      field: "stock: 18 vials · burn: 6/day",
      risk: "orange",
    },
  ]);

  console.log("Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
