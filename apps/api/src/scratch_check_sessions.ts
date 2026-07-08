import "../../apps/api/src/lib/env.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, status, failure_reason, audio_url, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching sessions:", error);
    return;
  }

  console.log("Recent sessions:");
  console.log(JSON.stringify(sessions, null, 2));
}

main().catch(console.error);
