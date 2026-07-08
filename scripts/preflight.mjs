#!/usr/bin/env node
/**
 * Preflight: verify the environment is actually wired up before you run the
 * stack. Checks that required env vars are present AND that Supabase, Redis and
 * (when needed) Gemini / the selected ASR provider key are reachable — so a
 * misconfiguration surfaces here instead of as a confusing runtime failure.
 *
 *   node scripts/preflight.mjs          # or: pnpm preflight
 *
 * Exits 0 if all hard checks pass, 1 otherwise. Uses only Node built-ins.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import tls from "node:tls";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/* ------------------------------- .env load ------------------------------- */
// Minimal parser (no dotenv dependency at the repo root). Existing process.env
// wins over the file so CI / shell overrides are respected.
function loadEnv() {
  const path = join(root, ".env");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

/* ------------------------------- reporting ------------------------------- */
const results = [];
function pass(name, detail = "") {
  results.push({ status: "pass", name, detail });
}
function fail(name, detail = "") {
  results.push({ status: "fail", name, detail });
}
function warn(name, detail = "") {
  results.push({ status: "warn", name, detail });
}

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, r) => setTimeout(() => r(new Error(`${label} timed out`)), ms)),
  ]);

/* -------------------------------- checks --------------------------------- */
function checkRequiredEnv() {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "REDIS_URL",
  ];
  for (const key of required) {
    if (process.env[key]) pass(`env ${key}`);
    else fail(`env ${key}`, "missing");
  }

  const provider = process.env.ASR_PROVIDER || "mock";
  pass("env ASR_PROVIDER", provider);
  // Gemini is required for note generation regardless of ASR provider.
  if (process.env.GEMINI_API_KEY) pass("env GEMINI_API_KEY");
  else fail("env GEMINI_API_KEY", "missing (worker note generation needs it)");

  // ASR-provider-specific keys (only the selected provider is enforced).
  const keyFor = {
    sarvam: "SARVAM_API_KEY",
    sarvam_batch: "SARVAM_API_KEY",
    deepgram: "DEEPGRAM_API_KEY",
    assemblyai: "ASSEMBLYAI_API_KEY",
    faster_whisper: "FASTER_WHISPER_URL",
  };
  const needed = keyFor[provider];
  if (provider === "mock") {
    warn("ASR provider", "mock — no real transcription (fine for local dev)");
  } else if (needed && !process.env[needed]) {
    fail(`env ${needed}`, `required by ASR_PROVIDER=${provider}`);
  } else if (needed) {
    pass(`env ${needed}`);
  }
}

async function checkSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return; // already reported as missing env
  try {
    // Hitting a real table verifies both connectivity AND that migrations ran.
    const res = await withTimeout(
      fetch(`${url.replace(/\/$/, "")}/rest/v1/doctors?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }),
      8000,
      "Supabase",
    );
    if (res.ok) pass("Supabase REST", "reachable, doctors table present");
    else if (res.status === 404)
      fail("Supabase REST", "reachable but schema not applied (run ALL_MIGRATIONS.sql)");
    else fail("Supabase REST", `HTTP ${res.status}`);
  } catch (err) {
    fail("Supabase REST", err.message);
  }
}

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return;
  try {
    const res = await withTimeout(
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      ),
      8000,
      "Gemini",
    );
    if (res.ok) pass("Gemini API", "key valid");
    else if (res.status === 400 || res.status === 403)
      fail("Gemini API", `key rejected (HTTP ${res.status})`);
    else fail("Gemini API", `HTTP ${res.status}`);
  } catch (err) {
    fail("Gemini API", err.message);
  }
}

function checkRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return Promise.resolve();
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail("Redis", "REDIS_URL is not a valid URL");
    return Promise.resolve();
  }
  const useTls = parsed.protocol === "rediss:";
  const port = Number(parsed.port) || 6379;
  const host = parsed.hostname;
  const password = decodeURIComponent(parsed.password || "");
  const username = decodeURIComponent(parsed.username || "");

  return new Promise((resolve) => {
    let settled = false;
    const done = (fn, ...args) => {
      if (settled) return; // settle once — avoid double destroy (libuv assert)
      settled = true;
      try {
        socket.removeAllListeners();
        socket.destroy();
      } catch {}
      fn(...args);
      resolve();
    };
    const onData = (buf) => {
      const s = buf.toString();
      if (s.includes("PONG")) done(pass, "Redis", `PING ok (${host}:${port})`);
      else if (s.startsWith("-"))
        done(fail, "Redis", s.split("\r\n")[0].slice(1));
      else done(pass, "Redis", `connected (${host}:${port})`);
    };
    const onConnect = () => {
      // AUTH first if credentials present, then PING.
      let cmd = "";
      if (password) {
        cmd += username
          ? `AUTH ${username} ${password}\r\n`
          : `AUTH ${password}\r\n`;
      }
      cmd += "PING\r\n";
      socket.write(cmd);
    };
    const socket = useTls
      ? tls.connect({ host, port, servername: host }, onConnect)
      : net.connect({ host, port }, onConnect);
    socket.setTimeout(8000);
    socket.on("data", onData);
    socket.on("timeout", () => done(fail, "Redis", "connection timed out"));
    socket.on("error", (err) => done(fail, "Redis", err.message));
  });
}

/* --------------------------------- run ----------------------------------- */
checkRequiredEnv();
await Promise.all([checkSupabase(), checkGemini(), checkRedis()]);

const icon = { pass: "\x1b[32m✓\x1b[0m", fail: "\x1b[31m✗\x1b[0m", warn: "\x1b[33m!\x1b[0m" };
console.log("\nGooqi preflight\n───────────────");
for (const r of results) {
  console.log(`${icon[r.status]} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
}
const failed = results.filter((r) => r.status === "fail");
console.log("───────────────");
if (failed.length) {
  console.log(`\x1b[31m${failed.length} check(s) failed.\x1b[0m Fix the above, then re-run: pnpm preflight\n`);
  process.exit(1);
}
console.log("\x1b[32mAll checks passed.\x1b[0m You're ready to run: pnpm dev\n");
