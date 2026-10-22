import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { withTimeout } from "@/lib/timeout";

/**
 * Free, unauthenticated readiness check for the forms: is the database reachable, and is the
 * background job system there? In development the job system is the local Inngest dev server
 * (npm run dev:jobs); in production it is Inngest Cloud, reached through our signing key.
 * Never returns details beyond ok/not ok.
 *
 * Light by design (2026-10-19): the result is cached for 30 s per process and every external
 * check gives up after 3 s, so a slow database or job server can never pile up requests or hold
 * the server. A check that times out counts as "not ok" until the next check.
 */

type Health = { demoMode: boolean; database: boolean | null; jobs: boolean | null; checkedAt: string; cached?: boolean };
const CACHE_MS = 30_000;
const CHECK_MS = 3_000;
const g = globalThis as unknown as { __clipelleHealth?: { at: number; value: Health; pending?: Promise<Health> } };

async function check(): Promise<Health> {
  const database = await withTimeout(CHECK_MS, "database check timed out", () => db().execute(sql`select 1`))
    .then(() => true)
    .catch(() => false);

  let jobs: boolean;
  if (process.env.INNGEST_DEV === "1" || process.env.INNGEST_DEV === "true") {
    const base = process.env.INNGEST_DEV_SERVER_URL?.trim() || "http://localhost:8288";
    jobs = await fetch(`${base}/health`, { cache: "no-store", signal: AbortSignal.timeout(CHECK_MS) })
      .then((r) => r.ok)
      .catch(() => false);
  } else {
    jobs = Boolean(process.env.INNGEST_EVENT_KEY?.trim() && process.env.INNGEST_SIGNING_KEY?.trim());
  }
  return { demoMode: false, database, jobs, checkedAt: new Date().toISOString() };
}

export async function GET() {
  await connection();
  if (config.demoMode) return Response.json({ demoMode: true, database: null, jobs: null, checkedAt: new Date().toISOString() });

  const cache = g.__clipelleHealth;
  if (cache && Date.now() - cache.at < CACHE_MS) return Response.json({ ...cache.value, cached: true });
  // One check at a time: concurrent callers share the same promise instead of each hitting the services.
  if (cache?.pending) return Response.json({ ...(await cache.pending), cached: true });
  const pending = check();
  g.__clipelleHealth = { at: cache?.at ?? 0, value: cache?.value ?? { demoMode: false, database: null, jobs: null, checkedAt: "" }, pending };
  const value = await pending;
  g.__clipelleHealth = { at: Date.now(), value };
  return Response.json(value);
}
