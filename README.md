# Gooqi Health Transcriber

Clinical AI tool that records doctor–patient consultations, transcribes them with
speaker labels (Indian English / Hindi / Hinglish), and generates structured SOAP
notes + prescriptions for doctor review and sign-off. See `../PRD.md` for the full spec.

## Monorepo layout

```
apps/
  web/      Next.js 15 (App Router) — auth, recording, review, sign-off, history
  api/      Express REST API — sessions, chunked upload, finalise-audio, queue producer
  worker/   BullMQ worker — ASR pipeline + two-call SOAP/prescription generation
packages/
  shared/   @gooqi/shared — ASR abstraction, Zod schemas, LLM tool defs, DB types
supabase/   SQL migrations, RLS, storage bucket, combined ALL_MIGRATIONS.sql
```

## Prerequisites

- Node ≥ 20, pnpm ≥ 11
- A Supabase project (free tier is fine)
- A Gemini API key (for note generation)
- A Redis instance (e.g. Upstash free tier) for the BullMQ job queue

## 1. Install

```bash
pnpm install
```

## 2. Configure environment

Copy `.env.example` → `.env` and fill in the required variables.

| Var | Needed by | Notes / Values |
|-----|-----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | All | The URL of your Supabase project (e.g. `https://giokilhxwatscmjcidwl.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Supabase anon key (safe for browser access). |
| `SUPABASE_SERVICE_ROLE_KEY` | API, Worker | Supabase service role key (keep secret, bypasses RLS). |
| `GEMINI_API_KEY` | Worker | Google Gemini key required for structured SOAP note and prescription generation. |
| `ASR_PROVIDER` | Worker | Speech-to-Text provider. **Use `sarvam_batch` (recommended for production/full audio) or `mock` (for local development).** |
| `SARVAM_API_KEY` | Worker | Your subscription key for Sarvam AI (needed if using `sarvam` or `sarvam_batch`). |
| `REDIS_URL` | API, Worker | Redis connection string (e.g. Upstash or local) for the BullMQ job queue. |
| `API_PORT` / `WEB_ORIGIN` / `NEXT_PUBLIC_API_URL` | — | Network configuration. Defaults: `4000` / `http://localhost:3000` / `http://localhost:4000`. |

> [!WARNING]
> **GOQii Vertex (Gemini) ASR Note:**
> The `goqii_vertex` ASR provider (`https://apiv6.goqii.com/vertex/recording`) is currently deprecated/decommissioned and returns `404 Not Found`. Avoid setting `ASR_PROVIDER=goqii_vertex`. Instead, use `sarvam_batch` or `mock`.

`apps/web/.env.local` holds the three `NEXT_PUBLIC_*` variables for the browser build (Next.js reads its own env file).

## 3. Apply the database schema

**Option A — SQL Editor (Easiest)**
1. Open your Supabase Dashboard.
2. Navigate to the **SQL Editor**.
3. Copy the entire contents of the file `supabase/ALL_MIGRATIONS.sql`.
4. Paste it into the editor and click **Run**. This creates the tables, schemas, RLS policies, append-only consent trigger, and the private `session-audio` storage bucket.

**Option B — Supabase CLI**
If you have the CLI configured, run:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

*Note: Ensure **Email OTP** sign-in is enabled in your Supabase project (Authentication → Providers → Email → turn on "Email OTP" / magic link).*

## 4. Run the application

### Step 1: Preflight check (Optional)
Run the preflight check to ensure all environment variables are correctly configured and external services (Supabase, Redis, Gemini, ASR) are reachable:
```bash
pnpm preflight
```

### Step 2: Start the Development Server
This runs the Next.js frontend, Express API server, and BullMQ worker concurrently under Turborepo:
```bash
pnpm dev
```

If you prefer to run services individually:
```bash
pnpm --filter @gooqi/web dev      # Frontend (:3000)
pnpm --filter @gooqi/api dev      # API (:4000)
pnpm --filter @gooqi/worker dev   # Job queue / worker
```

## 5. End-to-end Testing

### testing with `ASR_PROVIDER=mock` (Local Dev)
1. Set `ASR_PROVIDER=mock` in your `.env` file.
2. Start the dev server (`pnpm dev`).
3. Open `http://localhost:3000` and sign in with email OTP (if testing locally with Supabase, magic links will be sent or caught).
4. Click **New Session**, enter a patient's details, tick the consent box, and click **Start**.
5. Record a short consultation and click **Stop**.
6. The app uploads the audio chunks to Supabase, finalizes the audio, and starts transcribing.
7. Using the `mock` provider, a deterministic doctor–patient exchange is simulated immediately. 
8. The SOAP note and prescriptions will generate automatically via Gemini and transition the status to **Draft**.

### testing with `ASR_PROVIDER=sarvam_batch` (Production)
1. Set `ASR_PROVIDER=sarvam_batch` in your `.env` and fill in `SARVAM_API_KEY`.
2. Start the dev server (`pnpm dev`).
3. Follow the same recording steps.
4. The `sarvam_batch` provider uploads the audio file to Sarvam, polls for transcription completion (supporting files >30 seconds), performs speaker diarization, and passes the transcript to Gemini to generate clinical notes.

## Security & compliance

- **MFA (TOTP)** — doctors enable two-factor auth in **Settings**; login then
  requires a code (AAL2), enforced by `apps/web/src/middleware.ts`.
- **Attributable sign-off (IT Act 2000 §5)** — finalising a note requires a
  fresh step-up re-authentication (password re-entry or emailed code); the API
  verifies the proof and records `signoff_method` / IP / user-agent.
- **Consent** — hard gate, shown in EN/HI, with `consent_language` written to an
  append-only `consent_log`.
- **Docs**: `docs/legal/DPA_TEMPLATE.md` (data-processing agreement) and
  `docs/compliance/DPDP_CHECKLIST.md` (status of every DPDP/SPDI obligation,
  including the pre-pilot blockers).

## ASR bake-off

Compare providers on real clinic audio before choosing one:

```bash
pnpm --filter @gooqi/worker bakeoff <manifest.json> --out results.json
```

Prints a WER/CER + speaker-count scorecard. See
`apps/worker/src/bakeoff/README.md` for the manifest schema and test-set design
(≥100 clips, 3-speaker scenarios, graded noise).

## Testing

```bash
pnpm test         # vitest across packages (WER metrics, sign-off rule, schemas)
```

CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → build on every PR.

## Architecture notes

- **ASR is swappable** behind `ASRProvider` (`packages/shared/src/asr`). Switch
  providers via the `ASR_PROVIDER` env var only — no code change (PRD §6.2, G9).
- **Note generation** is a two-call Google Gemini function-calling flow (forced
  call via `toolConfig.functionCallingConfig.mode: "ANY"`) with server-side Zod
  validation before any DB write, with a one-shot retry on validation failure
  (PRD §6.3). Model: `gemini-2.5-flash`.
- **Crash-safe recording**: 30s `MediaRecorder` chunks written to IndexedDB
  before upload, with retry/backoff, a resume banner on reload, WakeLock, and
  background-flush on tab hide (PRD §6.4).
- **Consent is a hard gate**: no consent → no session; every consent is written
  to the append-only `consent_log` (PRD SC-2/SC-3).

## Deployment (Railway + Supabase)

- **api** and **worker** deploy as two Railway services from `apps/api` and
  `apps/worker` (build `pnpm --filter @gooqi/<svc> build`, start `node dist/...`).
  Add a Railway Redis plugin and set `REDIS_URL`.
- **web** deploys to Vercel/Railway; set the `NEXT_PUBLIC_*` vars + `NEXT_PUBLIC_API_URL`.
- For DPDP compliance, set `ASR_PROVIDER=sarvam` once a DPA is signed, or
  `faster_whisper` (self-hosted) as the DPA-free fallback (PRD §8.3).
