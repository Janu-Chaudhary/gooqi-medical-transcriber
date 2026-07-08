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

const hosts = [
  "api.goqii.com",
  "apiv5.goqii.com",
  "apiv6.goqii.com",
  "apiv7.goqii.com",
  "apiv6-qa.goqii.com",
  "apiv6-dev.goqii.com",
  "apiv6-stage.goqii.com",
  "apiv6-sandbox.goqii.com",
];

async function main() {
  const headers = {
    "clientId": clientId,
    "clientSecret": clientSecret,
    "Content-Type": "application/json"
  };

  for (const host of hosts) {
    const url = `https://${host}/vertex/recording`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          file: "https://giokilhxwatscmjcidwl.supabase.co/storage/v1/object/public/session-audio/nonexistent.webm",
          prompt: "transcribe"
        })
      });
      const text = await res.text();
      const parsed = text.slice(0, 100);

      if (res.status !== 404 || !parsed.includes("Not Found")) {
        console.log(`[SUCCESS/FOUND] ${host} -> Status ${res.status}, Body: ${parsed}`);
      } else {
        console.log(`[404] ${host}`);
      }
    } catch (err) {
      console.log(`[FAILED TO REACH] ${host} -> ${err.message}`);
    }
  }
}

main().catch(console.error);
