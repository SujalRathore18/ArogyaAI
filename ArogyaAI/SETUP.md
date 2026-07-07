# Local Setup — ArogyaAI

## Requirements
- Node.js v20+
- pnpm — `npm install -g pnpm`
- A PostgreSQL database — free option: https://neon.tech (create a project,
  copy the connection string)
- A Gemini API key (optional but recommended) — free at
  https://aistudio.google.com/apikey. Without it, the AI chat feature
  falls back to canned demo replies instead of real AI responses.

## 1. Install dependencies

From the project root:
```bash
pnpm install
```

## 2. Set up environment variables

Copy each `.env.example` to `.env` and fill in real values:

```bash
cp lib/db/.env.example lib/db/.env
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp artifacts/arogya-ai/.env.example artifacts/arogya-ai/.env
```

- `lib/db/.env` and `artifacts/api-server/.env` both need the same
  `DATABASE_URL` from your Postgres provider.
- `artifacts/api-server/.env` also needs a `JWT_SECRET` — generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Add your `GEMINI_API_KEY` there too, if you have one.

## 3. Push the database schema

```bash
cd lib/db
pnpm push
```

## 4. Seed demo data

This populates hospitals, medicines, doctors, zones, and starter alerts:

```bash
pnpm seed
cd ../..
```

## 5. Run the backend

In one terminal:
```bash
cd artifacts/api-server
pnpm dev
```
It should log that it's listening on port 8080.

## 6. Run the frontend

In a second terminal:
```bash
cd artifacts/arogya-ai
pnpm dev
```

## 7. Open it

Visit **http://localhost:5000**. Register a new account (choose "Patient /
ASHA Worker" or "District Management" as the role), or continue as guest for
a quick read-only look.

## Troubleshooting

- **"Missing required environment variable"** on backend startup — you
  skipped step 2 for `artifacts/api-server/.env`.
- **Frontend loads but shows loading spinners forever** — the backend isn't
  running, or `CORS_ORIGIN` in `artifacts/api-server/.env` doesn't match the
  frontend's actual URL.
- **Empty dashboard, no hospitals/medicines/etc.** — you skipped step 4
  (seeding).
