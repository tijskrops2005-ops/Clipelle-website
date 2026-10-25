import { afterAll, describe, expect, it } from "vitest";

/**
 * A first visit fires several requests at once (shell, page, data); each used to create a personal
 * workspace, so one user got three (24 Oct 2026). Five concurrent calls must give one workspace,
 * one membership, and the same id to every caller. Skipped without DATABASE_URL.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const user = { id: "00000000-0000-0000-0000-0000000000f7", email: "first-visit@clipelle.local", name: "First visit" };

describe.skipIf(!hasDb)("personal workspace on a first visit", () => {
  afterAll(async () => {
    const { db, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().delete(workspaces).where(eq(workspaces.ownerUserId, user.id));
  });

  it("creates exactly one, even with concurrent requests", async () => {
    const { ensurePersonalWorkspace } = await import("./workspaces");
    const rows = await Promise.all(Array.from({ length: 5 }, () => ensurePersonalWorkspace(user)));
    expect(new Set(rows.map((r) => r.id)).size).toBe(1);

    const { db, workspaces, workspaceMembers } = await import("@/lib/db");
    const { and, eq } = await import("drizzle-orm");
    const all = await db().select().from(workspaces).where(and(eq(workspaces.ownerUserId, user.id), eq(workspaces.kind, "personal")));
    expect(all).toHaveLength(1);
    const members = await db().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, all[0].id));
    expect(members).toHaveLength(1);
  });
});
