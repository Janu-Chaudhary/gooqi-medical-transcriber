/**
 * Singleton service-role Supabase client.
 *
 * Env:
 *  - SUPABASE_URL                — project URL
 *  - SUPABASE_SERVICE_ROLE_KEY   — service-role key (bypasses RLS; server only)
 *
 * The service-role client is used for ALL server work: it bypasses Row Level
 * Security, so every route must enforce doctor ownership in code.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Fail fast at boot rather than on the first request.
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — Supabase calls will fail.",
  );
}

/** Name of the Storage bucket holding per-session audio chunks + assembled audio. */
export const AUDIO_BUCKET = "session-audio";

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY ?? "",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);
