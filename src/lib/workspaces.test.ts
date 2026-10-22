import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Workspaces against the database (skipped without DATABASE_URL): a member sees only their own
 * workspaces, a non-member sees nothing, a removed member loses access at once, API keys belong
 * to a workspace, two members draw from one shared balance, and invitations work end to end.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const owner = { id: "00000000-0000-0000-0000-0000000000e1", email: "team-owner@clipelle.local", emailVerified: true, name: "Owner" };
const member = { id: "00000000-0000-0000-0000-0000000000e2", email: "team-member@clipelle.local", emailVerified: true, name: "Member" };
const outsider = { id: "00000000-0000-0000-0000-0000000000e3", email: "team-outsider@clipelle.local", emailVerified: true };
const ids = [owner.id, member.id, outsider.id];

describe.skipIf(!hasDb)("workspaces and teams", () => {
  let teamId = "";
  const made: string[] = [];

  beforeAll(async () => {
    const { db, profiles } = await import("@/lib/db");
    await db().insert(profiles).values(ids.map((id, i) => ({ userId: id, email: [owner, member, outsider][i].email }))).onConflictDoNothing();
    const ws = await import("./workspaces");
    for (const u of [owner, member, outsider]) await ws.ensurePersonalWorkspace(u);
  });

  afterAll(async () => {
    const { db, profiles, projects, workspaces, creditLedger, apiKeys } = await import("@/lib/db");
    const { inArray } = await import("drizzle-orm");
    if (made.length) await db().delete(projects).where(inArray(projects.id, made));
    await db().delete(apiKeys).where(inArray(apiKeys.userId, ids));
    await db().delete(creditLedger).where(inArray(creditLedger.userId, ids));
    await db().delete(workspaces).where(inArray(workspaces.ownerUserId, ids));
    await db().delete(profiles).where(inArray(profiles.userId, ids));
  });

  it("creates a team, invites by link, and lists workspaces per member only", async () => {
    const ws = await import("./workspaces");
    const { db, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    const team = await ws.createTeamWorkspace(owner, "Acme team");
    teamId = team.id;
    // Inviting needs the Business plan on the workspace.
    await expect(ws.inviteMember(team, owner, member.email, "member", "https://clipelle.test")).rejects.toMatchObject({ code: "plan_required" });
    await db().update(workspaces).set({ planKey: "business_249" }).where(eq(workspaces.id, teamId));
    const planned = (await ws.getWorkspace(teamId))!;
    const invite = await ws.inviteMember(planned, owner, member.email, "member", "https://clipelle.test");
    expect(invite.link).toMatch(/^https:\/\/clipelle\.test\/invite\//);
    const token = invite.link.split("/invite/")[1];
    // The wrong address cannot accept; the right one can.
    await expect(ws.acceptInvite(outsider, token)).rejects.toMatchObject({ code: "invite_email_mismatch" });
    await ws.acceptInvite(member, token);
    await expect(ws.acceptInvite(member, token)).rejects.toMatchObject({ code: "invite_invalid" });
    expect((await ws.listWorkspacesFor(member.id)).map((w) => w.id)).toContain(teamId);
    expect((await ws.listWorkspacesFor(outsider.id)).map((w) => w.id)).not.toContain(teamId);
    expect(await ws.membershipOf(teamId, outsider.id)).toBeNull();
    expect(await ws.membershipOf(teamId, member.id)).toBe("member");
  });

  it("isolates projects per workspace and shares the credit balance between members", async () => {
    const data = await import("./data/server");
    const credits = await import("./credits");
    const { getWorkspace, ensurePersonalWorkspace } = await import("./workspaces");
    await credits.grantCredits({ workspaceId: teamId, userId: owner.id, credits: 100, kind: "grant_manual", note: "test" });
    const scopeOwner = { userId: owner.id, workspaceId: teamId };
    const scopeMember = { userId: member.id, workspaceId: teamId };
    const a = await data.createDraft(scopeOwner, { workflow: "ad", ad: { name: "Team A", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "X", description: "Twenty characters of description here." } });
    const b = await data.createDraft(scopeMember, { workflow: "ad", ad: { name: "Team B", seconds: 10, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "Y", description: "Twenty characters of description here." } });
    made.push(a.id, b.id);
    // Both members see both projects; the outsider's personal scope sees none of them.
    expect((await data.listProjects(scopeMember)).map((p) => p.id)).toEqual(expect.arrayContaining([a.id, b.id]));
    const personalOutsider = { userId: outsider.id, workspaceId: (await ensurePersonalWorkspace(outsider)).id };
    expect(await data.getProject(a.id, personalOutsider)).toBeNull();
    // Two members reserve from one balance.
    await credits.reserveCredits(teamId, owner.id, a.id, 30, "A");
    await credits.reserveCredits(teamId, member.id, b.id, 30, "B");
    expect(await credits.getCreditBalance(teamId)).toBe(40);
    await expect(credits.reserveCredits(teamId, member.id, "00000000-0000-0000-0000-00000000ee01", 50, "C")).rejects.toMatchObject({ code: "insufficient_credits" });
    expect((await getWorkspace(teamId))!.planKey).toBe("business_249");
  });

  it("gives API keys to the workspace and ends a removed member's access at once", async () => {
    const ws = await import("./workspaces");
    const { createApiKey, findActiveKey } = await import("./apiKeys");
    const key = await createApiKey({ userId: member.id, workspaceId: teamId }, "member key");
    expect((await findActiveKey(key.key))?.workspaceId).toBe(teamId);
    const team = (await ws.getWorkspace(teamId))!;
    await ws.removeMember(team, member.id);
    expect(await ws.membershipOf(teamId, member.id)).toBeNull();
    expect(await findActiveKey(key.key)).toBeNull();
    expect((await ws.listWorkspacesFor(member.id)).map((w) => w.id)).not.toContain(teamId);
    await expect(ws.removeMember(team, owner.id)).rejects.toMatchObject({ code: "owner" });
  });

  it("transfers ownership and deletes the workspace with its projects", async () => {
    const ws = await import("./workspaces");
    const { db, workspaceMembers, projects } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().insert(workspaceMembers).values({ workspaceId: teamId, userId: member.id, role: "member" });
    let team = (await ws.getWorkspace(teamId))!;
    await ws.transferOwnership(team, owner.id, member.id);
    team = (await ws.getWorkspace(teamId))!;
    expect(team.ownerUserId).toBe(member.id);
    expect(await ws.membershipOf(teamId, owner.id)).toBe("member");
    await expect(ws.deleteWorkspace(team, owner.id, "Acme team")).rejects.toMatchObject({ code: "forbidden" });
    await expect(ws.deleteWorkspace(team, member.id, "wrong")).rejects.toMatchObject({ code: "confirm_mismatch" });
    await ws.deleteWorkspace(team, member.id, "Acme team");
    expect(await ws.getWorkspace(teamId)).toBeNull();
    expect(await db().select().from(projects).where(eq(projects.workspaceId, teamId))).toEqual([]);
    made.length = 0;
  });
});
