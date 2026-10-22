import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

/**
 * Public API v1 against the database (skipped without DATABASE_URL): key authentication, plan
 * rule, revocation, rate limit per key, isolation between accounts and idempotency records.
 * No workflow is started and nothing is sent to a provider.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const userA = `00000000-0000-0000-0000-0000000000a1`;
const userB = `00000000-0000-0000-0000-0000000000b1`;

function req(key?: string, url = "https://clipelle.test/api/v1/projects") {
  return new Request(url, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
}

describe.skipIf(!hasDb)("public API v1", () => {
  let keyA = "";
  let keyAId = "";
  const made: string[] = [];

  let wsA = "";
  let wsB = "";
  const scopeA = () => ({ userId: userA, workspaceId: wsA });
  const scopeB = () => ({ userId: userB, workspaceId: wsB });

  beforeAll(async () => {
    const { db, profiles, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().insert(profiles).values([{ userId: userA, email: "api-a@clipelle.local" }, { userId: userB, email: "api-b@clipelle.local" }]).onConflictDoNothing();
    const { ensurePersonalWorkspace } = await import("@/lib/workspaces");
    wsA = (await ensurePersonalWorkspace({ id: userA, email: "api-a@clipelle.local" })).id;
    wsB = (await ensurePersonalWorkspace({ id: userB, email: "api-b@clipelle.local" })).id;
    await db().update(workspaces).set({ planKey: "starter" }).where(eq(workspaces.id, wsA));
    const { createApiKey } = await import("@/lib/apiKeys");
    const k = await createApiKey(scopeA(), "test");
    keyA = k.key;
    keyAId = k.id;
  });

  afterAll(async () => {
    const { db, profiles, apiKeys, projects, workspaces } = await import("@/lib/db");
    const { inArray } = await import("drizzle-orm");
    if (made.length) await db().delete(projects).where(inArray(projects.id, made));
    await db().delete(apiKeys).where(inArray(apiKeys.userId, [userA, userB]));
    await db().delete(workspaces).where(inArray(workspaces.ownerUserId, [userA, userB]));
    await db().delete(profiles).where(inArray(profiles.userId, [userA, userB]));
    delete process.env.API_RATE_LIMIT_PER_MINUTE;
  });

  it("refuses the free plan, a missing key and a wrong key", async () => {
    const { createApiKey } = await import("@/lib/apiKeys");
    await expect(createApiKey(scopeB(), "nope")).rejects.toMatchObject({ code: "plan_required" });
    const { authenticateApi } = await import("./v1");
    await expect(authenticateApi(req())).rejects.toMatchObject({ code: "unauthorized", status: 401 });
    await expect(authenticateApi(req("rl_" + "x".repeat(43)))).rejects.toMatchObject({ code: "unauthorized" });
    await expect(authenticateApi(req("not-a-key"))).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("accepts the key, records last use, and stops after revocation", async () => {
    const { authenticateApi } = await import("./v1");
    const caller = await authenticateApi(req(keyA));
    expect(caller.userId).toBe(userA);
    expect(caller.workspaceId).toBe(wsA);
    expect(caller.keyId).toBe(keyAId);
    const { listApiKeys, revokeApiKey, createApiKey } = await import("@/lib/apiKeys");
    const listed = await listApiKeys(wsA);
    expect(listed.find((k) => k.id === keyAId)?.lastUsedAt).toBeTruthy();
    expect(listed.find((k) => k.id === keyAId)?.prefix.startsWith("rl_")).toBe(true);
    await revokeApiKey(wsA, keyAId);
    await expect(authenticateApi(req(keyA))).rejects.toMatchObject({ code: "unauthorized" });
    await expect(revokeApiKey(wsB, keyAId)).rejects.toMatchObject({ code: "not_found" });
    const k2 = await createApiKey(scopeA(), "second");
    keyA = k2.key;
    keyAId = k2.id;
  });

  it("limits requests per key in the database", async () => {
    process.env.API_RATE_LIMIT_PER_MINUTE = "3";
    const { authenticateApi } = await import("./v1");
    const { createApiKey } = await import("@/lib/apiKeys");
    const k = await createApiKey(scopeA(), "limited");
    for (let i = 0; i < 3; i++) await authenticateApi(req(k.key));
    await expect(authenticateApi(req(k.key))).rejects.toMatchObject({ code: "rate_limited", status: 429 });
    delete process.env.API_RATE_LIMIT_PER_MINUTE;
  });

  it("keeps accounts apart: another account's project is a 404", async () => {
    const { createDraft } = await import("@/lib/data/server");
    const { db, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().update(workspaces).set({ planKey: "starter" }).where(eq(workspaces.id, wsB));
    const { createApiKey } = await import("@/lib/apiKeys");
    const kB = await createApiKey(scopeB(), "b");
    const rowA = await createDraft(scopeA(), { workflow: "ad", ad: { name: "Isolation A", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "X", description: "Twenty characters of description here." } });
    made.push(rowA.id);
    const { GET } = await import("@/app/api/v1/projects/[id]/route");
    const mine = await GET(req(keyA, `https://clipelle.test/api/v1/projects/${rowA.id}`), { params: Promise.resolve({ id: rowA.id }) });
    expect(mine.status).toBe(200);
    const body = (await mine.json()) as { project: { id: string; kind: string; steps: { key: string; label: string }[] } };
    expect(body.project.kind).toBe("ad");
    expect(body.project.steps.map((s) => s.key)).toEqual(["script", "productClip", "presenter", "finalEdit"]);
    expect(JSON.stringify(body)).not.toMatch(/heygen|shotstack|fal\.ai|claude|anthropic/i);
    const theirs = await GET(req(kB.key, `https://clipelle.test/api/v1/projects/${rowA.id}`), { params: Promise.resolve({ id: rowA.id }) });
    expect(theirs.status).toBe(404);
    const { GET: LIST } = await import("@/app/api/v1/projects/route");
    const listB = (await (await LIST(req(kB.key))).json()) as { projects: { id: string }[] };
    expect(listB.projects.some((p) => p.id === rowA.id)).toBe(false);
    await db().delete((await import("@/lib/db")).apiKeys).where(eq((await import("@/lib/db")).apiKeys.userId, userB));
    await db().update(workspaces).set({ planKey: "free" }).where(eq(workspaces.id, wsB));
  });

  it("replays the same request under an Idempotency-Key and refuses a different body", async () => {
    const { withIdempotency } = await import("./v1");
    const idem = `test-${randomUUID()}`;
    let calls = 0;
    const { createDraft } = await import("@/lib/data/server");
    const make = async () => {
      calls += 1;
      const row = await createDraft(scopeA(), { workflow: "ad", ad: { name: `Idem ${calls}`, seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "X", description: "Twenty characters of description here." } });
      made.push(row.id);
      return row.id;
    };
    const first = await withIdempotency(keyAId, idem, { a: 1 }, make);
    const second = await withIdempotency(keyAId, idem, { a: 1 }, make);
    expect(second.projectId).toBe(first.projectId);
    expect(second.replayed).toBe(true);
    expect(calls).toBe(1);
    await expect(withIdempotency(keyAId, idem, { a: 2 }, make)).rejects.toMatchObject({ code: "idempotency_mismatch", status: 409 });
    const noKey = await withIdempotency(keyAId, null, { a: 1 }, make);
    expect(noKey.replayed).toBe(false);
    expect(calls).toBe(2);
    // A failed create leaves no record, so the key can be retried.
    const failing = `fail-${randomUUID()}`;
    await expect(withIdempotency(keyAId, failing, {}, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    const again = await withIdempotency(keyAId, failing, {}, make);
    expect(again.replayed).toBe(false);
  });

  it("maps errors to stable codes without provider names", async () => {
    const { apiErrorResponse, ApiError } = await import("./v1");
    const { DataError } = await import("@/lib/data/server");
    const { CreditError } = await import("@/lib/credits");
    const { z } = await import("zod");
    const cases: [unknown, number, string][] = [
      [new ApiError("rate_limited", "slow down", 429, { retryAfterSeconds: 7 }), 429, "rate_limited"],
      [new DataError("free", 402, "free_plan_limit"), 402, "plan_required"],
      [new DataError("budget", 409, "creative_budget"), 409, "budget_exceeded"],
      [new CreditError("need more", 402, "insufficient_credits"), 402, "insufficient_credits"],
      [new Error("HeyGen said no"), 500, "server_error"],
    ];
    for (const [err, status, code] of cases) {
      const r = apiErrorResponse(err);
      expect(r.status).toBe(status);
      const b = (await r.json()) as { error: { code: string; message: string } };
      expect(b.error.code).toBe(code);
      expect(b.error.message).not.toMatch(/heygen/i);
    }
    const zodErr = z.object({ seconds: z.number() }).safeParse({ seconds: "x" });
    const zr = apiErrorResponse(zodErr.error);
    expect(zr.status).toBe(400);
    const limited = apiErrorResponse(new ApiError("rate_limited", "x", 429, { retryAfterSeconds: 7 }));
    expect(limited.headers.get("Retry-After")).toBe("7");
  });
});
