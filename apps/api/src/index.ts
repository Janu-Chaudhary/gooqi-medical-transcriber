/**
 * @gooqi/api — Express API server for the Gooqi clinical transcriber.
 *
 * Env:
 *  - API_PORT                    (default 4000)
 *  - WEB_ORIGIN                  CORS allowed origin (default http://localhost:3000)
 *  - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (see lib/supabase.ts)
 *  - REDIS_URL                   (see lib/queue.ts)
 */
import "./lib/env.js"; // must be first — loads .env before any env reads
import express from "express";
import cors from "cors";
import { sessionsRouter } from "./routes/sessions.js";
import { errorMiddleware } from "./middleware/error.js";

const API_PORT = Number(process.env.API_PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const app = express();

app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: true,
  }),
);
// JSON body parser. Multipart (chunk upload) is handled per-route by multer.
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", sessionsRouter);

// Central error handler (must be last).
app.use(errorMiddleware);

app.listen(API_PORT, () => {
  console.log(`[api] listening on :${API_PORT} (web origin: ${WEB_ORIGIN})`);
});
