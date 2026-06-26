/**
 * Loads environment variables from the monorepo-root `.env` (and a local
 * `.env` if present). Import this FIRST, before any module that reads
 * process.env. Walks up from this file to find the nearest `.env`.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Walk up to 6 levels looking for a .env (monorepo root or package root).
let dir = here;
for (let i = 0; i < 6; i++) {
  const candidate = join(dir, ".env");
  if (existsSync(candidate)) {
    config({ path: candidate });
  }
  const parent = dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
