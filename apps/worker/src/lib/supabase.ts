/**
 * Service-role Supabase client singleton.
 *
 * Uses the SUPABASE_SERVICE_ROLE_KEY — server-only, full DB + Storage access,
 * bypasses RLS. NEVER import this from any browser-bound code.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("SUPABASE_URL is not set");
if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

export const supabase: SupabaseClient = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
