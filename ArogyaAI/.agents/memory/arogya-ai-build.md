---
name: ArogyaAI build notes
description: Key decisions and quirks from building the ArogyaAI smart health platform.
---

## Summary
ArogyaAI is a React+Vite app at `artifacts/arogya-ai`. Frontend-only — all data seeded in `src/data/seed.ts`. Chat (Vaani) routes through the API server at `artifacts/api-server`.

## Patient page AI result panel
- Vaani Response now fetches real `/api/chat` reply in parallel with existing UX setTimeout chain; stale responses guarded by `reqIdRef` counter
- `PatientMap` (PatientMap.tsx) — Leaflet mini-map: pulsing patient marker + numbered hospital pins; remount key = `coords-hospitalName-risk`; async init guarded by `cancelled` flag to prevent post-unmount state updates
- Ambulance card (RED): 108 call link + ETA = distance / 40km/h * 60 min
- Nearby doctors panel (YELLOW/GREEN): from `doctorDirectory` filtered by `present`, sorted by haversine distance; uses `result.locality` (not live `locality` state) to avoid verdict-time mismatch
- `Verdict` interface extended with `locality: string` field

## Vaani AI chat (Gemini)
- API server exposes `POST /api/chat` → `artifacts/api-server/src/routes/chat.ts`
- Uses `@google/generative-ai` with `gemini-2.0-flash-lite`; also has `@google/genai` installed but not used (that SDK defaults to Vertex/OAuth)
- Frontend proxies `/api` → `localhost:8080` via Vite config (`server.proxy`)
- Graceful fallback: quota errors (429) return keyword-based triage so demo never breaks
- Rate limit: 30 req/min per IP via `express-rate-limit`
- History sanitisation: only `role:"user"` entries accepted from client to prevent prompt injection
- SOS button removed (was redundant with ChatWidget toggle)

## Architecture decisions
- All seeded data (hospitals, localities, medicines, doctors, footfall) lives in `src/data/seed.ts`.
- Three contexts: `LangContext` (EN/HI i18n), `AuthContext` (in-memory demo auth), `AlertLogContext` (shared alert log between Patient portal and Management console).
- Leaflet installed as `leaflet` + `@types/leaflet` in `artifacts/arogya-ai/devDependencies`.

## Leaflet gotcha
- Leaflet CSS imported via `@import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');` in index.css (must be early, before @import "tailwindcss").
- Map initialized in `useEffect` only, with cleanup on unmount to prevent duplicate instances.
- Call `map.invalidateSize()` after tab switches.

## Dynamic Tailwind class fix
- Dynamic class interpolation (e.g. `bg-${color}`) doesn't compile — replaced with explicit class maps using hardcoded hex colors (e.g. `bg-[#B23A2E]`).

## Voice APIs
- `SpeechSynthesis` for Vaani (hi-IN TTS), `SpeechRecognition` / `webkitSpeechRecognition` for mic input.
- Both wrapped in try/catch with toast fallback for unsupported browsers.

## Color palette (exact hex)
- Background: #F1F4EC, deep: #E7EDDE
- Ink: #1B2A22, soft: #4C5C50
- Line: #D3DBC5, card: #FFFFFF
- Accent: #E0952B, navy: #1F3A3D
- Green: #3B8C5A, red: #B23A2E, amber: #C77B18

**Why:** Preserving these for future edits — the palette is tightly coupled to the India-healthcare brand identity and must stay consistent.
