import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration test against the real database (skipped without DATABASE_URL): user A never sees
 * user B's projects, rows or files through the data layer. Creates two throw-away projects and
 * deletes them afterwards.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const userA = "00000000-0000-0000-0000-00000000000a";
const userB = "00000000-0000-0000-0000-00000000000b";
let scopeA: { userId: string; workspaceId: string };
let scopeB: { userId: string; workspaceId: string };

describe.skipIf(!hasDb)("ownership isolation", () => {
  let created: string[] = [];
  let data: typeof import("./server");
  let dbmod: typeof import("@/lib/db");

  beforeAll(async () => {
    data = await import("./server");
    dbmod = await import("@/lib/db");
    const { ensurePersonalWorkspace } = await import("@/lib/workspaces");
    scopeA = { userId: userA, workspaceId: (await ensurePersonalWorkspace({ id: userA, email: "a@reelay.local" })).id };
    scopeB = { userId: userB, workspaceId: (await ensurePersonalWorkspace({ id: userB, email: "b@reelay.local" })).id };
    const a = await data.createDraft(scopeA, { workflow: "ad", ad: { name: "Isolation A", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "A", description: "Twenty characters of description here." } });
    const b = await data.createDraft(scopeB, { workflow: "ad", ad: { name: "Isolation B", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "B", description: "Twenty characters of description here." } });
    created = [a.id, b.id];
  });

  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    if (created.length) await dbmod.db().delete(dbmod.projects).where(inArray(dbmod.projects.id, created));
    await dbmod.db().delete(dbmod.workspaces).where(inArray(dbmod.workspaces.ownerUserId, [userA, userB]));
  });

  it("lists only the caller's projects", async () => {
    const listA = await data.listProjects(scopeA);
    const listB = await data.listProjects(scopeB);
    expect(listA.some((p) => p.id === created[0])).toBe(true);
    expect(listA.some((p) => p.id === created[1])).toBe(false);
    expect(listB.some((p) => p.id === created[0])).toBe(false);
  });

  it("treats another user's project as not found", async () => {
    expect(await data.getProject(created[1], scopeA)).toBeNull();
    expect(await data.getProjectRow(created[1], scopeA)).toBeNull();
    await expect(data.attachUploadedAsset(scopeA, created[1], { kind: "image", storagePath: `projects/${created[1]}/image/x.png`, fileName: "x.png" })).rejects.toMatchObject({ status: 404 });
    await expect(data.startProject(scopeA, created[1])).rejects.toMatchObject({ status: 404 });
    await expect(data.retryStep(scopeA, created[1], "script")).rejects.toMatchObject({ status: 404 });
  });

  it("copies the owner onto step rows", async () => {
    const { eq } = await import("drizzle-orm");
    const rows = await dbmod.db().select().from(dbmod.steps).where(eq(dbmod.steps.projectId, created[0]));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.userId === userA)).toBe(true);
  });
});
