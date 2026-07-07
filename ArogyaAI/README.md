# ArogyaAI — Smart Public Health Platform (Indore)

A prototype health platform: patients/ASHA workers can report symptoms and get
AI-assisted triage + nearest-hospital routing; district management gets a live
dashboard of hospitals, medicine stock, doctor attendance, and ward health scores.

## What's real vs. demo in this build

This pass replaced the original prototype's fake data layer with a real
backend. Here's the honest state of things:

**Real and backend-backed:**
- User accounts — registration, login, bcrypt password hashing, JWT sessions
- Hospitals, medicines, doctors, zones — real Postgres tables, real REST API,
  real `pnpm --filter @workspace/db run seed` script to populate them
- Community Health Index — computed live from the real data above
- Patient symptom reports — submitted to a real `patient_reports` table
  (management-only to view, matching real access-control expectations)
- Alerts — persisted to a real table; new alerts raised in the app are saved,
  not just kept in memory
- AI chat/triage — calls Google Gemini for real, with a graceful demo fallback
  if no API key is configured

**Still demo/illustrative content** (flagged in code comments where used):
- `morningBrief` (Guardian morning summary) — a real version needs a scheduled
  job + LLM summarization pipeline. Out of scope for this pass.
- `userProfile` (Emergency QR card) — a real version needs a proper patient
  medical-profile table with consent/access controls, since it's sensitive
  health data. Not something to bolt on without a real design.
- Weekly `footfall` chart numbers — needs a visits/analytics tracking table.
- The Disaster Mode "Emergency Call Feed" and hardcoded zone reasons — a real
  version needs a dispatch/CAD system integration.

These are called out explicitly so nobody mistakes them for real data later.

## Project structure

```
ArogyaAI/
├── artifacts/
│   ├── api-server/      Express backend — auth, hospitals, medicines,
│   │                    doctors, zones, alerts, patient-reports, AI chat
│   ├── arogya-ai/        React + Vite frontend (patient + management views)
│   └── mockup-sandbox/   Design/prototype sandbox (not part of the main app)
├── lib/
│   ├── db/               Drizzle ORM schema, connection, and seed script
│   ├── api-spec/         OpenAPI spec
│   ├── api-zod/          Generated Zod validation schemas
│   └── api-client-react/ Generated API client (currently unused by the
│                          frontend — it talks to the backend with plain
│                          fetch via src/lib/api.ts instead)
├── scripts/              Build utility scripts
└── attached_assets/       Design/prototype reference files
```

## Running it locally

See [SETUP.md](./SETUP.md) for full step-by-step instructions
(Node/pnpm install, free Postgres DB, env vars, seeding, running both apps).

## Uploading to GitHub

See [GITHUB.md](./GITHUB.md).
