import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit: generates SQL migrations from src/lib/db/schema.ts into ./drizzle and applies them.
 * Uses DIRECT_DATABASE_URL (Supabase session pooler, port 5432): migrations need a normal
 * Postgres session, which the transaction pooler does not provide.
 * The npm scripts load .env.local via `node --env-file`, so the variable is present here.
 */
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_DATABASE_URL is not set in .env.local.");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
