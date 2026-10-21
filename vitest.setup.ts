import { readFileSync } from "node:fs";

/**
 * Loads .env.local into process.env for integration tests (never printed). Tests that need the
 * database skip themselves when DATABASE_URL is missing.
 */
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local: unit tests only */
}
