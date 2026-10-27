import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/** notifyProjectEnd against the database (skipped without DATABASE_URL): once per project, respects the owner's switch, skips batch members. */
const sent: { to: string; subject: string }[] = [];
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async (m: { to: string; subject: string }) => (sent.push(m), { sent: true })), notifyAddress: () => null }));

vi.mock("@/lib/mailPoster", () => ({ makeMailPoster: vi.fn(async () => null) }));

const hasDb = Boolean(process.env.DATABASE_URL);
const userId = "00000000-0000-0000-0000-0000000000ce";

describe.skipIf(!hasDb)("notifications", () => {
  let dbmod: typeof import("@/lib/db");
  let scope: { userId: string; workspaceId: string };
  const ids: string[] = [];
  beforeAll(async () => {
    dbmod = await import("@/lib/db");
    await dbmod.db().insert(dbmod.profiles).values({ userId, email: "notify-test@clipelle.local", name: "Notify Tester" }).onConflictDoNothing();
    const { ensurePersonalWorkspace } = await import("@/lib/workspaces");
    scope = { userId, workspaceId: (await ensurePersonalWorkspace({ id: userId, email: "notify-test@clipelle.local" })).id };
  });
  afterAll(async () => {
    const { eq, inArray } = await import("drizzle-orm");
    if (ids.length) await dbmod.db().delete(dbmod.projects).where(inArray(dbmod.projects.id, ids));
    await dbmod.db().delete(dbmod.workspaces).where(eq(dbmod.workspaces.ownerUserId, userId));
    await dbmod.db().delete(dbmod.profiles).where(eq(dbmod.profiles.userId, userId));
  });

  it("sends one mail per finished project, with the failure reason, and never twice", async () => {
    const { createDraft } = await import("@/lib/data/server");
    const { notifyProjectEnd } = await import("./notifications");
    const { eq } = await import("drizzle-orm");
    const row = await createDraft(scope, { workflow: "ad", ad: { name: "Notify me", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "Mug", description: "A ceramic mug that keeps coffee warm for two hours." } });
    ids.push(row.id);
    await notifyProjectEnd(row.id); // still a draft: nothing
    expect(sent).toHaveLength(0);
    await dbmod.db().update(dbmod.projects).set({ status: "failed" }).where(eq(dbmod.projects.id, row.id));
    await dbmod.db().update(dbmod.steps).set({ status: "failed", error: "The photo could not be read." }).where(eq(dbmod.steps.projectId, row.id));
    await notifyProjectEnd(row.id);
    await notifyProjectEnd(row.id);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "notify-test@clipelle.local", subject: 'Your ad "Notify me" stopped' });
  });

  it("respects the owner's switch", async () => {
    const { createDraft } = await import("@/lib/data/server");
    const { notifyProjectEnd } = await import("./notifications");
    const { updateNotifyEmail } = await import("@/lib/data/profile");
    const { eq } = await import("drizzle-orm");
    await updateNotifyEmail(userId, false);
    const row = await createDraft(scope, { workflow: "ad", ad: { name: "Quiet", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "Mug", description: "A ceramic mug that keeps coffee warm for two hours." } });
    ids.push(row.id);
    await dbmod.db().update(dbmod.projects).set({ status: "completed" }).where(eq(dbmod.projects.id, row.id));
    await notifyProjectEnd(row.id);
    expect(sent).toHaveLength(1);
    const [after] = await dbmod.db().select({ notifiedAt: dbmod.projects.notifiedAt }).from(dbmod.projects).where(eq(dbmod.projects.id, row.id));
    expect(after.notifiedAt).not.toBeNull();
  });
});
