import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Share links against the database (skipped without DATABASE_URL): token never stored, expiry, revoke, isolation, and nothing but the video leaks. */
const hasDb = Boolean(process.env.DATABASE_URL);
const userA = "00000000-0000-0000-0000-0000000000ea";
const userB = "00000000-0000-0000-0000-0000000000eb";

describe.skipIf(!hasDb)("share links", () => {
  let links: typeof import("./shareLinks");
  let dbmod: typeof import("@/lib/db");
  let scopeA: { userId: string; workspaceId: string };
  let scopeB: { userId: string; workspaceId: string };
  let projectId = "";
  beforeAll(async () => {
    links = await import("./shareLinks");
    dbmod = await import("@/lib/db");
    const { ensurePersonalWorkspace } = await import("@/lib/workspaces");
    scopeA = { userId: userA, workspaceId: (await ensurePersonalWorkspace({ id: userA, email: "share-a@reelay.local" })).id };
    scopeB = { userId: userB, workspaceId: (await ensurePersonalWorkspace({ id: userB, email: "share-b@reelay.local" })).id };
    const [p] = await dbmod.db().insert(dbmod.projects).values({ ownerId: userA, workspaceId: scopeA.workspaceId, workflow: "ad", name: "Shareable", status: "completed", input: { productName: "Mug", description: "A ceramic mug that keeps coffee warm.", imageAssetIds: [], script: "secret script" } }).returning();
    projectId = p.id;
    // Signing a download needs a real object: a few bytes under the project's own path (removed afterwards).
    const { putObject } = await import("@/lib/storage");
    await putObject(`projects/${projectId}/final/test.mp4`, new Uint8Array([0, 0, 0, 24]), "video/mp4");
    const [asset] = await dbmod.db().insert(dbmod.assets).values({ projectId, userId: userA, kind: "final", storagePath: `projects/${projectId}/final/test.mp4`, mime: "video/mp4", bytes: 4 }).returning();
    const { eq } = await import("drizzle-orm");
    await dbmod.db().update(dbmod.projects).set({ finalAssetId: asset.id }).where(eq(dbmod.projects.id, projectId));
  });
  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    const { deleteObject } = await import("@/lib/storage");
    await deleteObject(`projects/${projectId}/final/test.mp4`).catch(() => {});
    await dbmod.db().delete(dbmod.projects).where(inArray(dbmod.projects.workspaceId, [scopeA.workspaceId, scopeB.workspaceId]));
    await dbmod.db().delete(dbmod.workspaces).where(inArray(dbmod.workspaces.ownerUserId, [userA, userB]));
    await dbmod.db().delete(dbmod.profiles).where(inArray(dbmod.profiles.userId, [userA, userB]));
  });

  it("only the owner workspace can create, the token is not stored, and the page gets the video only", async () => {
    await expect(links.createShareLink(scopeB, projectId, {})).rejects.toMatchObject({ code: "not_found" });
    const made = await links.createShareLink(scopeA, projectId, { expiresInDays: 7, allowDownload: true });
    expect(made.token).toMatch(/^[A-Za-z0-9_-]{40,50}$/);
    const rows = await dbmod.db().select().from(dbmod.shareLinks);
    expect(JSON.stringify(rows)).not.toContain(made.token);
    const shared = await links.resolveShareToken(made.token);
    expect(shared).not.toBeNull();
    expect(Object.keys(shared!).sort()).toEqual(["allowDownload", "expiresAt", "language", "name", "videoUrl"]);
    expect(shared!.name).toBe("Shareable");
    expect(JSON.stringify(shared)).not.toContain("secret script");
    expect(await links.resolveShareToken("nope")).toBeNull();
    expect(await links.resolveShareToken(made.token.slice(0, -1) + (made.token.endsWith("a") ? "b" : "a"))).toBeNull();
  });

  it("stops working when expired or revoked, and only the owner can revoke", async () => {
    const { eq } = await import("drizzle-orm");
    const made = await links.createShareLink(scopeA, projectId, { expiresInDays: 1 });
    expect(await links.resolveShareToken(made.token)).not.toBeNull();
    await dbmod.db().update(dbmod.shareLinks).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(dbmod.shareLinks.id, made.id));
    expect(await links.resolveShareToken(made.token)).toBeNull();
    const fresh = await links.createShareLink(scopeA, projectId, {});
    await expect(links.revokeShareLink(scopeB, fresh.id)).rejects.toMatchObject({ code: "not_found" });
    await links.revokeShareLink(scopeA, fresh.id);
    expect(await links.resolveShareToken(fresh.token)).toBeNull();
    const list = await links.listShareLinks(scopeA, projectId);
    expect(list.find((l) => l.id === fresh.id)?.active).toBe(false);
    expect(await links.listShareLinks(scopeB, projectId)).toEqual([]);
  });
});
