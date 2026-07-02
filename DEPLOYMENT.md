# Deployment — Vercel (frontend) + Render (backend)

The app is a monorepo:

- **apps/web** — Next.js frontend → **Vercel**
- **apps/api** — Express API → **Render** (web service)
- **apps/worker** — BullMQ worker → **Render** (background worker)
- **Redis** — job queue → **Render** (Redis)

Deploy the **backend first** so you have the API URL to give the frontend.

---

## 1. Backend on Render (Blueprint)

The repo has a [`render.yaml`](./render.yaml) blueprint that defines the API,
worker, and Redis in one go.

1. **Render Dashboard → New → Blueprint** → connect the GitHub repo
   `ISHANT57/Goqii-Transcriber-` → **Apply**. Render reads `render.yaml`.
2. Fill the secret env vars (marked `sync: false`) under each service's
   **Environment** tab:

   **gooqi-api**
   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | `https://giokilhxwatscmjcidwl.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase → Settings → API → service_role)* |
   | `WEB_ORIGIN` | your Vercel URL (set after step 2 — start with `*` or a guess) |

   **gooqi-worker**
   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | same as above |
   | `SUPABASE_SERVICE_ROLE_KEY` | same as above |
   | `GEMINI_API_KEY` | *(your Google Gemini key)* |

   `REDIS_URL` is wired automatically from the Redis service; `ASR_PROVIDER`
   defaults to `mock` (switch to `sarvam`/`deepgram`/etc. once you add its key).
3. After deploy, note the API URL, e.g. **`https://gooqi-api.onrender.com`**.
   Verify: `https://gooqi-api.onrender.com/health` → `{"ok":true}`.

> **Plans:** Render's free tier does **not** include background workers or
> Redis — those need a paid (Starter) plan. The API can run on free (it
> cold-starts after inactivity). Without the worker, recordings upload but
> won't transcribe/generate notes.

---

## 2. Frontend on Vercel (Git integration)

1. **Vercel → Add New → Project** → import `ISHANT57/Goqii-Transcriber-`.
2. **Root Directory:** set to **`apps/web`** (important — it's a monorepo).
   Framework auto-detects as **Next.js**; leave build/install as default
   (Vercel handles the pnpm workspace and transpiles `@gooqi/shared`).
3. **Environment Variables:**
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://giokilhxwatscmjcidwl.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(copy from `apps/web/.env.local`)* |
   | `NEXT_PUBLIC_API_URL` | your Render API URL from step 1 (e.g. `https://gooqi-api.onrender.com`) |
4. **Deploy.** Note the URL, e.g. `https://gooqi-scribe.vercel.app`.

---

## 3. Wire the two together

1. **Render → gooqi-api → `WEB_ORIGIN`** = your Vercel URL
   (e.g. `https://gooqi-scribe.vercel.app`) → save (redeploys). This is the
   CORS allow-list, so the browser can call the API.
2. **Supabase → Authentication → URL Configuration:**
   - **Site URL:** your Vercel URL.
   - **Redirect URLs:** add `https://<your-vercel-domain>/auth/callback`
     (needed for email magic-link and Google OAuth in production).
3. If you enabled **Google OAuth**, add the Vercel domain to the Google Cloud
   OAuth client's authorized origins as well.

---

## Notes
- `mockaudios/` (244 MB of test audio) is git-ignored — not deployed.
- The API/worker run via `tsx` in production (see `render.yaml` for why).
- To go fully functional you need: Render worker running (paid) + a real
  `ASR_PROVIDER` + `GEMINI_API_KEY`. With `ASR_PROVIDER=mock` you get a
  deterministic demo transcript.
