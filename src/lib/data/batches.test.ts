import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * "Make variations" against the real database (skipped without DATABASE_URL). The job system is
 * stubbed: starting a project must never reach a provider from a test. Covers: the plan gate and
 * the 2–5 limit, reserving every variation's credits before the first run, refusing a batch that
 * the balance cannot cover without reserving anything, a partial failure refunding only its own
 * variation, and workspace isolation.
 */
vi.mock("@/lib/inngest/client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/inngest/client")>();
  return { ...mod, inngest: { ...mod.inngest, send: vi.fn(async () => ({ ids: [] })) } };
});

const hasDb = Boolean(process.env.DATABASE_URL);
const userA = "00000000-0000-0000-0000-0000000000ba";
const userB = "00000000-0000-0000-0000-0000000000bb";
let scopeA: { userId: string; workspaceId: string };
let scopeB: { userId: string; workspaceId: string };
const ad = { name: "Batch test", seconds: 10, engine: "avatar_iii" as const, language: "en" as const, speed: "normal" as const, tone: "direct" as const, reviewScript: false, productName: "Mug", description: "A ceramic mug that keeps coffee warm for two hours.", direction: "for commuters" };

describe.skipIf(!hasDb)("batches", () => {
  let batches: typeof import("./batches");
  let data: typeof import("./server");
  let dbmod: typeof import("@/lib/db");
  let credits: typeof import("@/lib/credits");
  const made: string[] = [];

  beforeAll(async () => {
    batches = await import("./batches");
    data = await import("./server");
    dbmod = await import("@/lib/db");
    credits = await import("@/lib/credits");
    const { ensurePersonalWorkspace } = await import("@/lib/workspaces");
    const { eq } = await import("drizzle-orm");
    scopeA = { userId: userA, workspaceId: (await ensurePersonalWorkspace({ id: userA, email: "batch-a@clipelle.local" })).id };
    scopeB = { userId: userB, workspaceId: (await ensurePersonalWorkspace({ id: userB, email: "batch-b@clipelle.local" })).id };
    await dbmod.db().update(dbmod.workspaces).set({ planKey: "pro" }).where(eq(dbmod.workspaces.id, scopeA.workspaceId));
  });

  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    for (const ws of [scopeA.workspaceId, scopeB.workspaceId]) {
      await dbmod.db().delete(dbmod.creditLedger).where(inArray(dbmod.creditLedger.workspaceId, [ws]));
      await dbmod.db().delete(dbmod.projects).where(inArray(dbmod.projects.workspaceId, [ws]));
      await dbmod.db().delete(dbmod.projectBatches).where(inArray(dbmod.projectBatches.workspaceId, [ws]));
    }
    await dbmod.db().delete(dbmod.workspaces).where(inArray(dbmod.workspaces.ownerUserId, [userA, userB]));
    await dbmod.db().delete(dbmod.profiles).where(inArray(dbmod.profiles.userId, [userA, userB]));
  });

  /** A product photo row so startProject accepts the draft (no storage object needed for the start itself). */
  async function giveImages(projectIds: string[]) {
    const { eq } = await import("drizzle-orm");
    for (const id of projectIds) {
      const [asset] = await dbmod.db().insert(dbmod.assets).values({ projectId: id, userId: userA, kind: "image", storagePath: `projects/${id}/image/test.png`, mime: "image/png", bytes: 3 }).returning();
      const [row] = await dbmod.db().select().from(dbmod.projects).where(eq(dbmod.projects.id, id));
      await dbmod.db().update(dbmod.projects).set({ input: { ...(row.input as object), imageAssetIds: [asset.id] } as never }).where(eq(dbmod.projects.id, id));
    }
  }

  it("refuses the free plan, fewer than 2 or more than 5 variations, and duplicates", async () => {
    await expect(batches.createBatch(scopeB, { ad, variants: [{ format: "unboxing" }, { format: "offer" }] })).rejects.toMatchObject({ code: "plan_feature" });
    await expect(batches.createBatch(scopeA, { ad, variants: [{ format: "unboxing" }] })).rejects.toMatchObject({ code: "bad_variants" });
    await expect(batches.createBatch(scopeA, { ad, variants: [{ format: "unboxing" }, { format: "offer" }, { format: "testimonial" }, { format: "before-after" }, { format: "problem-fix" }, { format: "three-reasons" }] })).rejects.toMatchObject({ code: "bad_variants" });
    await expect(batches.createBatch(scopeA, { ad, variants: [{ format: "unboxing" }, { format: "unboxing" }] })).rejects.toMatchObject({ code: "bad_variants" });
  });

  it("creates one draft per variation with the format or hook direction in front of the seller's own", async () => {
    const { batch, projectIds } = await batches.createBatch(scopeA, { ad, variants: [{ format: "unboxing" }, { hook: "question" }, { format: "offer" }] });
    made.push(...projectIds);
    expect(projectIds).toHaveLength(3);
    const rows = await data.listProjectsOfBatch(scopeA, batch.id);
    expect(rows.map((p) => (p.workflow === "ad" ? p.format ?? null : null))).toEqual(["unboxing", null, "offer"]);
    expect(rows.map((p) => (p.workflow === "ad" ? p.hook ?? null : null))).toEqual([null, "question", null]);
    expect(rows.every((p) => p.workflow === "ad" && p.direction?.startsWith("for commuters "))).toBe(true);
    expect(rows[0].workflow === "ad" && rows[0].tone).toBe("playful");
    expect(rows[1].workflow === "ad" && rows[1].tone).toBe("direct");
    // Isolation: the other workspace cannot see or start it.
    await expect(batches.getBatch(scopeB, batch.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(batches.startBatch(scopeB, batch.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("refuses to start when the balance cannot cover all variations, reserving nothing", async () => {
    const { batch, projectIds } = await batches.createBatch(scopeA, { ad, variants: [{ format: "unboxing" }, { format: "offer" }] });
    await giveImages(projectIds);
    const perAd = data.creditsForProject((await data.getProjectRow(projectIds[0], scopeA))!);
    await credits.grantCredits({ workspaceId: scopeA.workspaceId, userId: userA, credits: perAd, kind: "grant_manual", note: "test: one ad's worth" });
    await expect(batches.startBatch(scopeA, batch.id)).rejects.toMatchObject({ code: "insufficient_credits" });
    const { eq, and } = await import("drizzle-orm");
    const reserves = await dbmod.db().select().from(dbmod.creditLedger).where(and(eq(dbmod.creditLedger.workspaceId, scopeA.workspaceId), eq(dbmod.creditLedger.kind, "reserve")));
    expect(reserves).toHaveLength(0);
    expect(await credits.getCreditBalance(scopeA.workspaceId)).toBe(perAd);

    // With enough credits every variation reserves its own before the first run, and a replay starts nothing twice.
    await credits.grantCredits({ workspaceId: scopeA.workspaceId, userId: userA, credits: perAd * 3, kind: "grant_manual", note: "test: more" });
    const result = await batches.startBatch(scopeA, batch.id);
    expect(result.started).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    const after = await dbmod.db().select().from(dbmod.creditLedger).where(and(eq(dbmod.creditLedger.workspaceId, scopeA.workspaceId), eq(dbmod.creditLedger.kind, "reserve")));
    expect(after).toHaveLength(2);
    expect(await credits.getCreditBalance(scopeA.workspaceId)).toBe(perAd * 4 - perAd * 2);
    const again = await batches.startBatch(scopeA, batch.id);
    expect(again.started).toHaveLength(0);
    expect(again.already).toHaveLength(2);

    // One variation fails: only its reservation comes back; the other stays reserved; the batch is partial once the other completes.
    const { settleCredits } = credits;
    await settleCredits(projectIds[0], 0, "Project failed");
    expect(await credits.getCreditBalance(scopeA.workspaceId)).toBe(perAd * 4 - perAd);
    const { refreshBatchStatus, batchStatusOf } = await import("@/lib/batches");
    await dbmod.db().update(dbmod.projects).set({ status: "failed" }).where(eq(dbmod.projects.id, projectIds[0]));
    expect((await refreshBatchStatus(batch.id))?.status).toBe("processing");
    await dbmod.db().update(dbmod.projects).set({ status: "completed" }).where(eq(dbmod.projects.id, projectIds[1]));
    const fin = await refreshBatchStatus(batch.id);
    expect(fin).toEqual({ status: "partial", justFinished: true });
    expect(batchStatusOf(["failed", "failed"])).toBe("failed");
    expect(batchStatusOf(["completed", "completed"])).toBe("completed");
    expect((await batches.getBatch(scopeA, batch.id)).batch.status).toBe("partial");
  });

  it("refuses the whole batch when the per-account day limit would be exceeded", async () => {
    const { batch, projectIds } = await batches.createBatch(scopeA, { ad, variants: [{ hook: "question" }, { hook: "result" }] });
    await giveImages(projectIds);
    const before = process.env.MAX_COST_PER_USER_PER_DAY_USD;
    process.env.MAX_COST_PER_USER_PER_DAY_USD = "0.01";
    try {
      await expect(batches.startBatch(scopeA, batch.id)).rejects.toMatchObject({ code: "user_limit" });
    } finally {
      if (before === undefined) delete process.env.MAX_COST_PER_USER_PER_DAY_USD;
      else process.env.MAX_COST_PER_USER_PER_DAY_USD = before;
    }
    const { eq, and } = await import("drizzle-orm");
    const rows = await dbmod.db().select({ status: dbmod.projects.status }).from(dbmod.projects).where(and(eq(dbmod.projects.batchId, batch.id)));
    expect(rows.every((r) => r.status === "draft")).toBe(true);
  });
});
