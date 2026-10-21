import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { apiKeys, creditLedger, db, projects, workspaceInvites, workspaceMembers, workspaces, type WorkspaceRow } from "@/lib/db";
import { DataError } from "@/lib/data/errors";
import type { AppUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { isTeamPlan } from "@/lib/plans";

/**
 * Workspaces: every user has one personal workspace; a team workspace is shared by an Owner and
 * Members. Projects, credits, API keys and billing belong to a workspace. The current workspace is
 * remembered in the cookie `reelay_ws` (falls back to the personal one). No cost per seat.
 */
export type Role = "owner" | "member";
export const WORKSPACE_COOKIE = "reelay_ws";
const INVITE_DAYS = 7;

export async function ensurePersonalWorkspace(user: Pick<AppUser, "id" | "email" | "name">): Promise<WorkspaceRow> {
  const d = db();
  const [existing] = await d.select().from(workspaces).where(and(eq(workspaces.ownerUserId, user.id), eq(workspaces.kind, "personal"))).limit(1);
  if (existing) return existing;
  const name = user.name?.trim() || user.email.split("@")[0] || "Personal";
  const [row] = await d.insert(workspaces).values({ name, kind: "personal", ownerUserId: user.id }).returning();
  await d.insert(workspaceMembers).values({ workspaceId: row.id, userId: user.id, role: "owner" }).onConflictDoNothing();
  return row;
}

export async function getWorkspace(id: string): Promise<WorkspaceRow | null> {
  const [row] = await db().select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  return row ?? null;
}

export async function membershipOf(workspaceId: string, userId: string): Promise<Role | null> {
  const [m] = await db().select({ role: workspaceMembers.role }).from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))).limit(1);
  return (m?.role as Role | undefined) ?? null;
}

/** Every workspace the user is a member of, personal first. */
export async function listWorkspacesFor(userId: string) {
  const rows = await db()
    .select({ id: workspaces.id, name: workspaces.name, kind: workspaces.kind, planKey: workspaces.planKey, ownerUserId: workspaces.ownerUserId, role: workspaceMembers.role, createdAt: workspaces.createdAt })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(asc(workspaces.kind), asc(workspaces.createdAt));
  return rows.map((r) => ({ ...r, role: r.role as Role }));
}

/** The workspace the request acts in: the cookie's one when the user is a member, else the personal one. */
export async function resolveScope(user: AppUser): Promise<{ workspace: WorkspaceRow; role: Role }> {
  let wanted: string | undefined;
  try {
    wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  } catch {
    wanted = undefined;
  }
  if (wanted && /^[0-9a-f-]{36}$/i.test(wanted)) {
    const role = await membershipOf(wanted, user.id);
    const ws = role ? await getWorkspace(wanted) : null;
    if (ws && role) return { workspace: ws, role };
  }
  const personal = await ensurePersonalWorkspace(user);
  return { workspace: personal, role: "owner" };
}

/* ---------- teams ---------- */

export async function createTeamWorkspace(user: AppUser, name: string): Promise<WorkspaceRow> {
  const clean = name.trim().slice(0, 60);
  if (clean.length < 2) throw new DataError("Give the workspace a name of at least 2 characters.", 400, "bad_name");
  const d = db();
  const [row] = await d.insert(workspaces).values({ name: clean, kind: "team", ownerUserId: user.id }).returning();
  await d.insert(workspaceMembers).values({ workspaceId: row.id, userId: user.id, role: "owner" });
  return row;
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const clean = name.trim().slice(0, 60);
  if (clean.length < 2) throw new DataError("Give the workspace a name of at least 2 characters.", 400, "bad_name");
  await db().update(workspaces).set({ name: clean, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId));
}

export async function listMembers(workspaceId: string) {
  return db().select({ id: workspaceMembers.id, userId: workspaceMembers.userId, role: workspaceMembers.role, createdAt: workspaceMembers.createdAt }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId)).orderBy(asc(workspaceMembers.createdAt));
}

/** Credits used this month per member (reservations settled or pending), for the Owner's overview. */
export async function usagePerMember(workspaceId: string) {
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const rows = await db()
    .select({ userId: creditLedger.userId, used: sql<number>`coalesce(-sum(case when ${creditLedger.credits} < 0 then ${creditLedger.credits} else 0 end), 0)`, projects: sql<number>`count(distinct ${creditLedger.projectId})` })
    .from(creditLedger)
    .where(and(eq(creditLedger.workspaceId, workspaceId), gt(creditLedger.createdAt, month)))
    .groupBy(creditLedger.userId);
  return rows.map((r) => ({ userId: r.userId, used: Number(r.used), projects: Number(r.projects) }));
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Invites by e-mail (team workspaces on a team plan only). Returns the link to show when mail is off. */
export async function inviteMember(workspace: WorkspaceRow, invitedBy: AppUser, email: string, role: Role, siteUrl: string) {
  if (workspace.kind !== "team") throw new DataError("A personal workspace has no members. Create a team workspace first.", 400, "personal_workspace");
  if (!isTeamPlan(workspace.planKey)) throw new DataError("Inviting members needs the Business plan on this workspace. Pick it in Billing.", 402, "plan_required");
  const clean = email.trim().toLowerCase();
  const d = db();
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);
  // One open invite per address: a new one replaces the old link.
  await d.delete(workspaceInvites).where(and(eq(workspaceInvites.workspaceId, workspace.id), eq(workspaceInvites.email, clean), isNull(workspaceInvites.acceptedAt)));
  const [row] = await d.insert(workspaceInvites).values({ workspaceId: workspace.id, email: clean, role, tokenHash: hashToken(token), invitedBy: invitedBy.id, expiresAt }).returning();
  const link = `${siteUrl}/invite/${token}`;
  const mail = await sendEmail({ to: clean, subject: `You are invited to ${workspace.name} on Reelay`, text: `${invitedBy.name || invitedBy.email} invited you to the workspace "${workspace.name}" on Reelay as ${role}.\n\nAccept the invitation (valid ${INVITE_DAYS} days):\n${link}\n\nIf you did not expect this, ignore this e-mail.` });
  return { id: row.id, email: clean, role, expiresAt, link, mailed: mail.sent };
}

export async function listInvites(workspaceId: string) {
  return db().select({ id: workspaceInvites.id, email: workspaceInvites.email, role: workspaceInvites.role, expiresAt: workspaceInvites.expiresAt, createdAt: workspaceInvites.createdAt }).from(workspaceInvites).where(and(eq(workspaceInvites.workspaceId, workspaceId), isNull(workspaceInvites.acceptedAt), gt(workspaceInvites.expiresAt, new Date()))).orderBy(desc(workspaceInvites.createdAt));
}

export async function revokeInvite(workspaceId: string, inviteId: string) {
  await db().delete(workspaceInvites).where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, workspaceId)));
}

/** What an invite link points to, without accepting it. */
export async function inviteByToken(token: string) {
  const [row] = await db().select().from(workspaceInvites).where(eq(workspaceInvites.tokenHash, hashToken(token))).limit(1);
  if (!row) return null;
  const ws = await getWorkspace(row.workspaceId);
  if (!ws) return null;
  return { invite: row, workspace: ws, valid: !row.acceptedAt && row.expiresAt.getTime() > Date.now() };
}

/** Accepts an invite for the signed-in user; the e-mail must match the invitation. */
export async function acceptInvite(user: AppUser, token: string): Promise<WorkspaceRow> {
  const found = await inviteByToken(token);
  if (!found || !found.valid) throw new DataError("This invitation is no longer valid. Ask for a new one.", 410, "invite_invalid");
  if (found.invite.email !== user.email.toLowerCase()) throw new DataError(`This invitation was sent to ${found.invite.email}. Sign in with that address to accept it.`, 403, "invite_email_mismatch");
  const d = db();
  await d.insert(workspaceMembers).values({ workspaceId: found.workspace.id, userId: user.id, role: found.invite.role === "owner" ? "member" : (found.invite.role as Role) }).onConflictDoNothing();
  await d.update(workspaceInvites).set({ acceptedAt: new Date() }).where(eq(workspaceInvites.id, found.invite.id));
  return found.workspace;
}

/** Owner removes a member (never themselves); the member's running projects stay in the workspace. */
export async function removeMember(workspace: WorkspaceRow, memberUserId: string) {
  if (memberUserId === workspace.ownerUserId) throw new DataError("The owner cannot be removed. Transfer ownership first.", 400, "owner");
  const res = await db().delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, memberUserId))).returning({ id: workspaceMembers.id });
  if (res.length === 0) throw new DataError("Member not found.", 404, "not_found");
  // Keys the member made act in this workspace: revoke them with the member.
  await db().update(apiKeys).set({ revokedAt: new Date() }).where(and(eq(apiKeys.workspaceId, workspace.id), eq(apiKeys.userId, memberUserId), isNull(apiKeys.revokedAt)));
}

export async function leaveWorkspace(workspace: WorkspaceRow, userId: string) {
  if (workspace.kind === "personal") throw new DataError("You cannot leave your personal workspace.", 400, "personal_workspace");
  if (userId === workspace.ownerUserId) throw new DataError("The owner cannot leave. Transfer ownership or delete the workspace.", 400, "owner");
  await removeMember(workspace, userId);
}

export async function transferOwnership(workspace: WorkspaceRow, fromUserId: string, toUserId: string) {
  if (workspace.ownerUserId !== fromUserId) throw new DataError("Only the owner can transfer ownership.", 403, "forbidden");
  if (workspace.kind === "personal") throw new DataError("A personal workspace cannot change owner.", 400, "personal_workspace");
  const role = await membershipOf(workspace.id, toUserId);
  if (!role) throw new DataError("That person is not a member of this workspace.", 404, "not_found");
  await db().transaction(async (tx) => {
    await tx.update(workspaces).set({ ownerUserId: toUserId, updatedAt: new Date() }).where(eq(workspaces.id, workspace.id));
    await tx.update(workspaceMembers).set({ role: "owner" }).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, toUserId)));
    await tx.update(workspaceMembers).set({ role: "member" }).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, fromUserId)));
  });
}

/** Deletes a team workspace with everything in it (projects cascade through the data layer's delete of rows). */
export async function deleteWorkspace(workspace: WorkspaceRow, byUserId: string, confirmName: string) {
  if (workspace.kind === "personal") throw new DataError("A personal workspace cannot be deleted; delete the account instead.", 400, "personal_workspace");
  if (workspace.ownerUserId !== byUserId) throw new DataError("Only the owner can delete the workspace.", 403, "forbidden");
  if (confirmName.trim() !== workspace.name) throw new DataError("Type the workspace name exactly to confirm.", 400, "confirm_mismatch");
  const d = db();
  await d.delete(projects).where(eq(projects.workspaceId, workspace.id));
  await d.delete(creditLedger).where(eq(creditLedger.workspaceId, workspace.id));
  await d.delete(apiKeys).where(eq(apiKeys.workspaceId, workspace.id));
  await d.delete(workspaces).where(eq(workspaces.id, workspace.id)); // members and invites cascade
}

export async function workspaceByCustomer(customerId: string) {
  const [row] = await db().select().from(workspaces).where(eq(workspaces.stripeCustomerId, customerId)).limit(1);
  return row ?? null;
}

export async function updateWorkspaceBilling(workspaceId: string, patch: Partial<Pick<WorkspaceRow, "planKey" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionStatus" | "currentPeriodEnd">>) {
  await db().update(workspaces).set({ ...patch, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId));
}
