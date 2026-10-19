import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { devOnly, errorResponse } from "../_guard";

/**
 * Free: proves the database connection and lists row counts per table plus applied migrations.
 * Never returns connection details.
 */
export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  await connection();
  const started = Date.now();
  try {
    const d = db();
    const counts = await d.execute<{ table_name: string; rows: number }>(sql`
      select 'projects' as table_name, count(*)::int as rows from projects
      union all select 'steps', count(*)::int from steps
      union all select 'assets', count(*)::int from assets
      union all select 'translations', count(*)::int from translations
      union all select 'cost_entries', count(*)::int from cost_entries
      union all select 'webhook_events', count(*)::int from webhook_events
    `);
    const migrations = await d.execute<{ id: number; hash: string; created_at: string }>(sql`
      select id, hash, created_at from drizzle.__drizzle_migrations order by id
    `);
    const version = await d.execute<{ version: string }>(sql`select version()`);
    return Response.json({
      ok: true,
      latencyMs: Date.now() - started,
      postgres: version[0]?.version?.split(" on ")[0] ?? "unknown",
      tables: counts,
      migrations: migrations.map((m) => ({ id: m.id, hash: m.hash.slice(0, 12), createdAt: m.created_at })),
      env: {
        DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
        DIRECT_DATABASE_URL: Boolean(process.env.DIRECT_DATABASE_URL?.trim()),
        NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()),
        SUPABASE_SECRET_KEY: Boolean(process.env.SUPABASE_SECRET_KEY?.trim()),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
