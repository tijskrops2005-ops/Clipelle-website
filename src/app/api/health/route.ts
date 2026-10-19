import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { config } from "@/lib/config";
import { db } from "@/lib/db";

/**
 * Free, unauthenticated readiness check for the forms: is the database reachable, and is the
 * background job system there? In development the job system is the local Inngest dev server
 * (npm run dev:jobs); in production it is Inngest Cloud, reached through our signing key.
 * Never returns details beyond ok/not ok.
 */
export async function GET() {
  await connection();
  if (config.demoMode) return Response.json({ demoMode: true, database: null, jobs: null });

  const database = await db()
    .execute(sql`select 1`)
    .then(() => true)
    .catch(() => false);

  let jobs: boolean;
  if (process.env.INNGEST_DEV === "1" || process.env.INNGEST_DEV === "true") {
    const base = process.env.INNGEST_DEV_SERVER_URL?.trim() || "http://localhost:8288";
    jobs = await fetch(`${base}/health`, { cache: "no-store", signal: AbortSignal.timeout(1500) })
      .then((r) => r.ok)
      .catch(() => false);
  } else {
    jobs = Boolean(process.env.INNGEST_EVENT_KEY?.trim() && process.env.INNGEST_SIGNING_KEY?.trim());
  }
  return Response.json({ demoMode: false, database, jobs });
}
