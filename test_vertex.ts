import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Manually parse .env file to bypass needing 'dotenv' module at root
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const key = trimmed.slice(0, equalIndex).trim();
        let val = trimmed.slice(equalIndex + 1).trim();
        // Remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

const clientId = process.env.GOQII_VERTEX_CLIENT_ID || "";
const clientSecret = process.env.GOQII_VERTEX_CLIENT_SECRET || "";
const url = process.env.GOQII_VERTEX_URL || "https://apiv6.goqii.com/vertex/recording";

console.log("Configured Client ID:", clientId ? "Present" : "Missing");
console.log("Configured Client Secret:", clientSecret ? "Present" : "Missing");
console.log("Testing URL:", url);

const combinations = [
  { name: "camelCase (clientId / clientSecret)", headers: { "clientId": clientId, "clientSecret": clientSecret } },
  { name: "kebab-case (client-id / client-secret)", headers: { "client-id": clientId, "client-secret": clientSecret } },
  { name: "snake_case (client_id / client_secret)", headers: { "client_id": clientId, "client_secret": clientSecret } }
];

async function main() {
  for (const comb of combinations) {
    console.log(`\n--- Testing combination: ${comb.name} ---`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...comb.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file: "https://giokilhxwatscmjcidwl.supabase.co/storage/v1/object/public/session-audio/nonexistent.webm",
          prompt: "transcribe"
        })
      });

      console.log("Response Status:", res.status);
      console.log("Response Headers:", Object.fromEntries(res.headers.entries()));
      const text = await res.text();
      console.log("Response Body (first 300 chars):", text.slice(0, 300));
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }
}

main().catch(console.error);
