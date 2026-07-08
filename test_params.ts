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
const baseUrl = "https://apiv6.goqii.com/vertex/recording";

async function test(name: string, url: string, headers: Record<string, string>, body: Record<string, any>) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    const text = await res.text();
    const parsed = text.slice(0, 100);
    console.log(`[${res.status}] ${name} -> ${parsed}`);
  } catch (err) {
    console.error(`[ERROR] ${name} ->`, err.message);
  }
}

async function main() {
  // Test 1: Credentials in Query Params (camelCase)
  await test(
    "Query Params (camelCase)",
    `${baseUrl}?clientId=${clientId}&clientSecret=${clientSecret}`,
    { "Content-Type": "application/json" },
    { file: "https://giokilhxwatscmjcidwl.supabase.co/storage/v1/object/public/session-audio/nonexistent.webm", prompt: "transcribe" }
  );

  // Test 2: Credentials in Query Params (snake_case)
  await test(
    "Query Params (snake_case)",
    `${baseUrl}?client_id=${clientId}&client_secret=${clientSecret}`,
    { "Content-Type": "application/json" },
    { file: "https://giokilhxwatscmjcidwl.supabase.co/storage/v1/object/public/session-audio/nonexistent.webm", prompt: "transcribe" }
  );

  // Test 3: Credentials in Query Params (kebab-case)
  await test(
    "Query Params (kebab-case)",
    `${baseUrl}?client-id=${clientId}&client-secret=${clientSecret}`,
    { "Content-Type": "application/json" },
    { file: "https://giokilhxwatscmjcidwl.supabase.co/storage/v1/object/public/session-audio/nonexistent.webm", prompt: "transcribe" }
  );

  // Test 4: Credentials in Request Body (camelCase)
  await test(
    "Body Params (camelCase)",
    baseUrl,
    { "Content-Type": "application/json" },
    { file: "https://giokilhxwatscmjcidwl.supabase.co/storage/v1/object/public/session-audio/nonexistent.webm", prompt: "transcribe", clientId, clientSecret }
  );

  // Test 5: Credentials in Request Body (snake_case)
  await test(
    "Body Params (snake_case)",
    baseUrl,
    { "Content-Type": "application/json" },
    { file: "https://giokilhxwatscmjcidwl.supabase.co/storage/v1/object/public/session-audio/nonexistent.webm", prompt: "transcribe", client_id: clientId, client_secret: clientSecret }
  );
}

main().catch(console.error);
