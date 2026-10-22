import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getTableColumns, getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Proves "default deny" for the Supabase Data API roles, live against the project
 * (skipped without the database and storage variables):
 * 1. every table in public has row-level security on and anon/authenticated hold no grants;
 * 2. the publishable key without a session (anon) cannot read or write any table;
 * 3. a signed-in user (authenticated) cannot either: the app has no policies, only the server;
 * 4. the private bucket cannot be listed; the public examples bucket stays public on purpose.
 * The app itself reaches Postgres as `postgres` and Storage with the secret key, so it is unaffected.
 * No key is ever printed.
 */
const env = {
  db: process.env.DATABASE_URL,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""),
  anon: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  secret: process.env.SUPABASE_SECRET_KEY,
};
const ready = Boolean(env.db && env.url && env.anon && env.secret);

/** Every table the app declares. A table added without RLS fails the first test. */
const TABLES = (Object.values(schema) as unknown[])
  .filter((v): v is PgTable => is(v, PgTable))
  .map((t) => ({ name: getTableName(t), column: Object.values(getTableColumns(t))[0].name }))
  .sort((a, b) => a.name.localeCompare(b.name));

type Probe = { table: string; method: string; status: number; rows: number };

/** GET, POST, PATCH and DELETE on one table through the Data API with the given bearer token. */
async function probeTable({ name: table, column }: { name: string; column: string }, token: string): Promise<Probe[]> {
  const headers = { apikey: env.anon!, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const out: Probe[] = [];
  const get = await fetch(`${env.url}/rest/v1/${table}?select=*&limit=1`, { headers });
  const body = await get.json().catch(() => null);
  out.push({ table, method: "GET", status: get.status, rows: Array.isArray(body) ? body.length : 0 });
  // PATCH and DELETE carry a filter on the first column (Supabase refuses unfiltered ones before any permission check).
  for (const method of ["POST", "PATCH", "DELETE"] as const) {
    const filter = method === "POST" ? "" : `?${column}=not.is.null`;
    const r = await fetch(`${env.url}/rest/v1/${table}${filter}`, { method, headers: { ...headers, Prefer: "return=representation" }, body: method === "DELETE" ? undefined : "{}" });
    const b = await r.json().catch(() => null);
    out.push({ table, method, status: r.status, rows: Array.isArray(b) ? b.length : 0 });
  }
  return out;
}

const refused = (p: Probe) => (p.status === 401 || p.status === 403 || p.status === 404) && p.rows === 0;

describe.skipIf(!ready)("row level security: default deny for the Data API roles", () => {
  let userId: string | null = null;
  let userToken: string | null = null;

  beforeAll(async () => {
    // A throw-away verified user, so the "authenticated" role is tested with a real session.
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(env.url!, env.secret!, { auth: { persistSession: false, autoRefreshToken: false } });
    const email = `rls-probe-${randomUUID().slice(0, 8)}@clipelle.local`;
    const password = randomUUID();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(`Could not create the probe user: ${created.error?.message}`);
    userId = created.data.user.id;
    const client = createClient(env.url!, env.anon!, { auth: { persistSession: false, autoRefreshToken: false } });
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw new Error(`Could not sign the probe user in: ${signedIn.error?.message}`);
    userToken = signedIn.data.session.access_token;
  });

  afterAll(async () => {
    if (!userId) return;
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(env.url!, env.secret!, { auth: { persistSession: false, autoRefreshToken: false } });
    await admin.auth.admin.deleteUser(userId);
  });

  it("has RLS on every table and no grants for anon or authenticated", async () => {
    const { db } = await import("./index");
    const rls = await db().execute<{ tablename: string; rowsecurity: boolean }>(sql`select tablename, rowsecurity from pg_tables where schemaname = 'public'`);
    for (const t of TABLES) expect(rls.find((r) => r.tablename === t.name)?.rowsecurity, `RLS on ${t.name}`).toBe(true);
    for (const r of rls) expect(r.rowsecurity, `RLS on ${r.tablename}`).toBe(true);
    const grants = await db().execute<{ table_name: string; grantee: string }>(sql`select table_name, grantee from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated')`);
    expect(grants).toEqual([]);
    const usage = await db().execute<{ grantee: string }>(sql`select grantee from information_schema.usage_privileges where object_schema = 'public' and grantee in ('anon', 'authenticated')`);
    expect(usage).toEqual([]);
    const policies = await db().execute<{ policyname: string }>(sql`select policyname from pg_policies where schemaname = 'public'`);
    expect(policies).toEqual([]);
  });

  it("refuses the publishable key (anon) on every table and every verb", async () => {
    expect(TABLES.map((t) => t.name)).toContain("rate_limits");
    expect(TABLES.length).toBeGreaterThanOrEqual(11);
    const probes = (await Promise.all(TABLES.map((t) => probeTable(t, env.anon!)))).flat();
    const leaks = probes.filter((p) => !refused(p));
    expect(leaks, JSON.stringify(leaks)).toEqual([]);
  });

  it("refuses a signed-in user (authenticated) on every table and every verb", async () => {
    const probes = (await Promise.all(TABLES.map((t) => probeTable(t, userToken!)))).flat();
    const leaks = probes.filter((p) => !refused(p));
    expect(leaks, JSON.stringify(leaks)).toEqual([]);
  });

  it("keeps the private bucket closed and the examples bucket public", async () => {
    const { BUCKET: bucket } = await import("@/lib/storage");
    for (const token of [env.anon!, userToken!]) {
      const headers = { apikey: env.anon!, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const list = await fetch(`${env.url}/storage/v1/object/list/${bucket}`, { method: "POST", headers, body: JSON.stringify({ prefix: "", limit: 10 }) });
      const body = await list.json().catch(() => null);
      expect(list.status >= 400 || (Array.isArray(body) && body.length === 0), `list private bucket: ${list.status}`).toBe(true);
      const upload = await fetch(`${env.url}/storage/v1/object/${bucket}/probe/${randomUUID()}.txt`, { method: "POST", headers: { ...headers, "Content-Type": "text/plain" }, body: "probe" });
      expect(upload.status, "upload to private bucket").toBeGreaterThanOrEqual(400);
    }
    const pub = await fetch(`${env.url}/storage/v1/object/public/examples/ad-dress-30s-standard.mp4`, { method: "HEAD" });
    expect([200, 404]).toContain(pub.status); // public by design; 404 only when the sample is not uploaded yet
  });
});
