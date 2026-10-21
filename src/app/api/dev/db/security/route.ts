import { connection } from "next/server";
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { publishableKey, supabaseUrl } from "@/lib/supabase/server";
import { devOnly, errorResponse } from "../../_guard";

/** Every table the app declares, so a new one is checked automatically. */
const TABLES = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable)).map((t) => getTableName(t)).sort();

/**
 * Security check for the database, run live every time the page loads:
 * 1. row-level security is enabled on every table (pg_tables.rowsecurity);
 * 2. the Data API roles (anon, authenticated) hold no grants on them;
 * 3. a real request with the publishable key against the Data API is refused
 *    (GET on every table, one INSERT attempt, one storage listing).
 * Never prints a key.
 */
export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  await connection();
  try {
    const rls = await db().execute<{ tablename: string; rowsecurity: boolean }>(sql`
      select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename
    `);
    const grants = await db().execute<{ table_name: string; grantee: string; privilege_type: string }>(sql`
      select table_name, grantee, privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
    `);

    const base = supabaseUrl();
    const key = publishableKey();
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const probes: { name: string; status: number; refused: boolean; detail: string }[] = [];
    for (const t of TABLES) {
      const r = await fetch(`${base}/rest/v1/${t}?select=*&limit=1`, { headers, cache: "no-store" });
      const body = await r.text();
      probes.push({ name: `GET ${t}`, status: r.status, refused: r.status === 401 || r.status === 403, detail: body.slice(0, 120) });
    }
    const ins = await fetch(`${base}/rest/v1/projects`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ workflow: "ad", name: "security probe", input: {} }),
      cache: "no-store",
    });
    probes.push({ name: "POST projects", status: ins.status, refused: ins.status === 401 || ins.status === 403, detail: (await ins.text()).slice(0, 120) });
    const list = await fetch(`${base}/storage/v1/object/list/reelay`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 5 }),
      cache: "no-store",
    });
    const listBody = await list.text();
    // Storage: a private bucket without policies returns an empty list or an error for this key.
    probes.push({ name: "storage list bucket", status: list.status, refused: list.status >= 400 || listBody.trim() === "[]", detail: listBody.slice(0, 120) });

    const rlsOk = TABLES.every((t) => rls.find((r) => r.tablename === t)?.rowsecurity === true);
    const grantsOk = grants.length === 0;
    const probesOk = probes.every((p) => p.refused);
    return Response.json({
      ok: rlsOk && grantsOk && probesOk,
      rls: TABLES.map((t) => ({ table: t, enabled: rls.find((r) => r.tablename === t)?.rowsecurity === true })),
      grants: grants.map((g) => `${g.grantee}:${g.privilege_type} on ${g.table_name}`),
      probes,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
