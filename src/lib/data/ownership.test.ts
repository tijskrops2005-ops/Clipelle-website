import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration test against the real database (skipped without DATABASE_URL): user A never sees
 * user B's projects, rows or files through the data layer. Creates two throw-away projects and
 * deletes them afterwards.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const userA = "00000000-0000-0000-0000-00000000000a";
const userB = "00000000-0000-0000-0000-00000000000b";

describe.skipIf(!hasDb)("ownership isolation", () => {
  let created: string[] = [];
  let data: typeof import("./server");
  let dbmod: typeof import("@/lib/db");

  beforeAll(async () => {
    data = await import("./server");
    dbmod = await import("@/lib/db");
    const a = await data.createDraft(userA, { workflow: "ad", ad: { name: "Isolation A", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "A", description: "Twenty characters of description here." } });
    const b = await data.createDraft(userB, { workflow: "ad", ad: { name: "Isolation B", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "B", description: "Twenty characters of description here." } });
    created = [a.id, b.id];
  });

  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    if (created.length) await dbmod.db().delete(dbmod.projects).where(inArray(dbmod.projects.id, created));
  });

  it("lists only the caller's projects", async () => {
    const listA = await data.listProjects(userA);
    const listB = await data.listProjects(userB);
    expect(listA.some((p) => p.id === created[0])).toBe(true);
    expect(listA.some((p) => p.id === created[1])).toBe(false);
    expect(listB.some((p) => p.id === created[0])).toBe(false);
  });

  it("treats another user's project as not found", async () => {
    expect(await data.getProject(created[1], userA)).toBeNull();
    expect(await data.getProjectRow(created[1], userA)).toBeNull();
    await expect(data.attachUploadedAsset(userA, created[1], { kind: "image", storagePath: `projects/${created[1]}/image/x.png`, fileName: "x.png" })).rejects.toMatchObject({ status: 404 });
    await expect(data.startProject(userA, created[1])).rejects.toMatchObject({ status: 404 });
    await expect(data.retryStep(userA, created[1], "script")).rejects.toMatchObject({ status: 404 });
  });

  it("copies the owner onto step rows", async () => {
    const { eq } = await import("drizzle-orm");
    const rows = await dbmod.db().select().from(dbmod.steps).where(eq(dbmod.steps.projectId, created[0]));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.userId === userA)).toBe(true);
  });
});
