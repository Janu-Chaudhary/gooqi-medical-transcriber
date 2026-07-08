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

const paths = [
  "/vertex/recording",
  "/vertex/transcribe",
  "/vertex/audio",
  "/vertex/transcription",
  "/vertex/v1/recording",
  "/vertex/v1/transcribe",
  "/vertex/v1/audio",
  "/vertex/v1/transcription",
  "/vertex",
];

const methods = ["POST", "GET"];

async function main() {
  const headers = {
    "clientId": clientId,
    "clientSecret": clientSecret,
    "Content-Type": "application/json"
  };

  for (const path of paths) {
    for (const method of methods) {
      const url = `https://apiv6.goqii.com${path}`;
      try {
        const init: RequestInit = {
          method,
          headers,
        };
        if (method === "POST") {
          init.body = JSON.stringify({
            file: "https://giokilhxwatscmjcidwl.supabase.co/storage/v1/object/public/session-audio/nonexistent.webm",
            prompt: "transcribe"
          });
        }

        const res = await fetch(url, init);
        const text = await res.text();
        const parsed = text.slice(0, 100);

        if (res.status !== 404 || !parsed.includes("Not Found")) {
          console.log(`[SUCCESS/FOUND] ${method} ${path} -> Status ${res.status}, Body: ${parsed}`);
        } else {
          console.log(`[404] ${method} ${path}`);
        }
      } catch (err) {
        console.error(`[ERROR] ${method} ${path} ->`, err.message);
      }
    }
  }
}

main().catch(console.error);
