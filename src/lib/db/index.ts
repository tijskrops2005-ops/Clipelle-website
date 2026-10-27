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

type Db = ReturnType<typeof createDb>["db"];

function createDb() {
  const client = postgres(requireDatabaseUrl(), {
    prepare: false,
    max: 4,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connect_timeout: 10,
    ssl: "require",
    connection: { application_name: "clipelle" },
  });
  return { db: drizzle({ client, schema }), client };
}

/**
 * After a long quiet spell (a laptop that slept, a server that idled) the pooled sockets may be dead
 * without anyone noticing: the 20-second idle timer does not run during sleep, and a query on such a
 * socket waits until TCP gives up (27 Oct 2026: 47–54 s per request, then ECONNRESET). So after more
 * than 25 s without use the pool is replaced by a fresh one.
 *
 * The old pool is never ended (27 Oct 2026): code that still held it (a job step that waited for a
 * render, a request in flight) got CONNECTION_DESTROYED and a translation failed on it. Its idle
 * connections close by themselves after `idle_timeout`, and a query on it simply opens a new one.
 */
const STALE_AFTER_MS = 25_000;

// Cached on globalThis so Next.js dev hot reloads reuse the connection.
const globalForDb = globalThis as unknown as { __clipelleDb?: Db; __clipelleDbClient?: ReturnType<typeof postgres>; __clipelleDbUsedAt?: number };

export function db(): Db {
  const now = Date.now();
  const stale = globalForDb.__clipelleDbUsedAt === undefined || now - globalForDb.__clipelleDbUsedAt > STALE_AFTER_MS;
  if (!globalForDb.__clipelleDb || stale) {
    const fresh = createDb();
    globalForDb.__clipelleDb = fresh.db;
    globalForDb.__clipelleDbClient = fresh.client;
  }
  globalForDb.__clipelleDbUsedAt = now;
  return globalForDb.__clipelleDb;
}

export { schema };
export * from "./schema";
