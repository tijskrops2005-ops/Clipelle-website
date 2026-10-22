import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Outgoing webhooks against the database (skipped without DATABASE_URL): URL rules, the secret shown
 * once, isolation between workspaces, a delivery attempt that records the outcome and the retry.
 * The job system and the network are stubbed.
 */
const sent: unknown[] = [];
vi.mock("@/lib/inngest/client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/inngest/client")>();
  return { ...mod, inngest: { ...mod.inngest, send: vi.fn(async (e: unknown) => (sent.push(e), { ids: [] })) } };
});

const hasDb = Boolean(process.env.DATABASE_URL);
const userA = "00000000-0000-0000-0000-0000000000da";
const userB = "00000000-0000-0000-0000-0000000000db";
const publicLookup = async () => ["93.184.216.34"];
const privateLookup = async () => ["10.0.0.5"];

describe.skipIf(!hasDb)("outgoing webhooks", () => {
  let out: typeof import("./outgoing");
  let dbmod: typeof import("@/lib/db");
  let scopeA: { userId: string; workspaceId: string };
  let scopeB: { userId: string; workspaceId: string };
  beforeAll(async () => {
    out = await import("./outgoing");
    dbmod = await import("@/lib/db");
    const { ensurePersonalWorkspace } = await import("@/lib/workspaces");
    scopeA = { userId: userA, workspaceId: (await ensurePersonalWorkspace({ id: userA, email: "wh-a@clipelle.local" })).id };
    scopeB = { userId: userB, workspaceId: (await ensurePersonalWorkspace({ id: userB, email: "wh-b@clipelle.local" })).id };
  });
  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    const ws = [scopeA.workspaceId, scopeB.workspaceId];
    await dbmod.db().delete(dbmod.webhookDeliveries).where(inArray(dbmod.webhookDeliveries.workspaceId, ws));
    await dbmod.db().delete(dbmod.webhookEndpoints).where(inArray(dbmod.webhookEndpoints.workspaceId, ws));
    await dbmod.db().delete(dbmod.workspaces).where(inArray(dbmod.workspaces.ownerUserId, [userA, userB]));
    await dbmod.db().delete(dbmod.profiles).where(inArray(dbmod.profiles.userId, [userA, userB]));
    vi.unstubAllGlobals();
  });

  it("accepts only public https URLs and known events", async () => {
    await expect(out.createEndpoint(scopeA, { url: "http://example.com/hook", events: ["project.completed"] }, publicLookup)).rejects.toMatchObject({ code: "bad_url" });
    await expect(out.createEndpoint(scopeA, { url: "https://intranet.local/hook", events: ["project.completed"] }, privateLookup)).rejects.toMatchObject({ code: "bad_url" });
    await expect(out.createEndpoint(scopeA, { url: "https://127.0.0.1/hook", events: ["project.completed"] }, publicLookup)).rejects.toMatchObject({ code: "bad_url" });
    await expect(out.createEndpoint(scopeA, { url: "https://example.com/hook", events: ["something.else"] }, publicLookup)).rejects.toMatchObject({ code: "bad_events" });
  });

  it("returns the secret once and keeps workspaces apart", async () => {
    const made = await out.createEndpoint(scopeA, { url: "https://example.com/hook", events: ["project.completed", "project.failed"] }, publicLookup);
    expect(made.secret).toMatch(/^whsec_[a-f0-9]{48}$/);
    const listA = await out.listEndpoints(scopeA.workspaceId);
    expect(listA.map((e) => e.id)).toEqual([made.id]);
    expect(JSON.stringify(listA)).not.toContain("whsec_");
    expect(await out.listEndpoints(scopeB.workspaceId)).toEqual([]);
    await expect(out.deleteEndpoint(scopeB, made.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("delivers with a signature, records a failed attempt, and only the owner can retry", async () => {
    const { signWebhook, verifyWebhookSignature } = await import("./signature");
    const [endpoint] = await out.listEndpoints(scopeA.workspaceId);
    const [secretRow] = await dbmod.db().select({ secret: dbmod.webhookEndpoints.secret }).from(dbmod.webhookEndpoints);
    const [delivery] = await dbmod.db().insert(dbmod.webhookDeliveries).values({ endpointId: endpoint.id, workspaceId: scopeA.workspaceId, event: "project.completed", payload: { event: "project.completed", data: { id: "p1", status: "completed" } } }).returning();

    const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
    let answer = 500;
    vi.stubGlobal("fetch", vi.fn(async (url: URL | string, init: RequestInit) => {
      calls.push({ url: String(url), headers: init.headers as Record<string, string>, body: String(init.body) });
      return new Response(null, { status: answer });
    }));
    const failed = await out.attemptDelivery(delivery.id, publicLookup);
    expect(failed).toMatchObject({ ok: false, status: 500 });
    answer = 200;
    const ok = await out.attemptDelivery(delivery.id, publicLookup);
    expect(ok).toMatchObject({ ok: true, status: 200 });
    expect(calls).toHaveLength(2);
    expect(calls[1].headers["X-Clipelle-Event"]).toBe("project.completed");
    expect(verifyWebhookSignature(secretRow.secret, calls[1].body, calls[1].headers["X-Clipelle-Signature"])).toBe(true);
    expect(signWebhook(secretRow.secret, "x")).toMatch(/^t=\d+,v1=/);
    expect(JSON.parse(calls[1].body)).toMatchObject({ id: delivery.id, event: "project.completed", data: { id: "p1" } });
    const { eq } = await import("drizzle-orm");
    const [row] = await dbmod.db().select().from(dbmod.webhookDeliveries).where(eq(dbmod.webhookDeliveries.id, delivery.id));
    expect(row).toMatchObject({ status: "delivered", attempt: 2, responseStatus: 200 });

    await expect(out.retryDelivery(scopeB, delivery.id)).rejects.toMatchObject({ code: "not_found" });
    const before = sent.length;
    await out.retryDelivery(scopeA, delivery.id);
    expect(sent.length).toBe(before + 1);
    expect(sent[before]).toMatchObject({ name: "webhook/delivery.created", data: { deliveryId: delivery.id } });
  });
});
