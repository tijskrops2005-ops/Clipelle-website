import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database client (server-only), through Supabase's transaction pooler (port 6543): that pooler
 * does not support prepared statements, hence `prepare: false`.
 *
 * Pool settings (2026-10-19, after the server hung for minutes): a small pool instead of one
 * connection, so one stuck query can never block every other request (the health check, the
 * forms, the job steps); idle connections are closed after 20 s, before the pooler drops them
 * silently (a silently dropped socket made the single connection hang until TCP gave up);
 * connections are recycled after 10 minutes; connecting gives up after 10 s.
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
  const client = postgres(requireDatabaseUrl(), {
    prepare: false,
    max: 4,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connect_timeout: 10,
    ssl: "require",
    connection: { application_name: "reelay" },
  });
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
