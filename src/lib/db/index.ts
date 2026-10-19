import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database client (server-only). One connection per process, through Supabase's
 * transaction pooler (port 6543): that pooler does not support prepared statements,
 * hence `prepare: false`. `max: 1` keeps serverless functions from opening many sockets.
 *
 * The connection string is read at first use so a missing variable fails with a clear
 * message instead of at import time (which would also break `next build`).
 */

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy the transaction-pooler connection string from Supabase into .env.local.");
  }
  return url;
}

type Db = ReturnType<typeof createDb>;

function createDb() {
  const client = postgres(requireDatabaseUrl(), { prepare: false, max: 1, ssl: "require" });
  return drizzle({ client, schema });
}

// Cached on globalThis so Next.js dev hot reloads reuse the connection.
const globalForDb = globalThis as unknown as { __reelayDb?: Db };

export function db(): Db {
  if (!globalForDb.__reelayDb) globalForDb.__reelayDb = createDb();
  return globalForDb.__reelayDb;
}

export { schema };
export * from "./schema";
