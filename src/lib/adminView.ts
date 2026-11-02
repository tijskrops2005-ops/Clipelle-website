import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { adminViews, db, profiles, workspaces } from "@/lib/db";
import type { AppUser, Scope } from "@/lib/auth";
import { isAdmin } from "@/lib/adminAccess";
import { encodeViewCookie, parseViewCookie, VIEW_COOKIE, viewExpiry } from "@/lib/adminViewSession";
import { recordAudit } from "@/lib/adminAudit";

/**
 * "View as customer" on the server (2 Nov 2026): start a session (row + cookie, 30 minutes), turn
 * the signed-in administrator's scope into the customer's read-only scope while it lasts, end it.
 * The proxy refuses every write while the cookie is current; the data layer refuses writes on a
 * read-only scope as well. Start and end go to the audit log.
 */
export async function startView(admin: AppUser, targetUserId: string, request: Request | null) {
  const d = db();
  const [target] = await d.select().from(profiles).where(eq(profiles.userId, targetUserId)).limit(1);
  if (!target) throw new Error("Customer not found.");
  if (target.userId === admin.id) throw new Error("You are already signed in as yourself.");
  const [ws] = await d.select().from(workspaces).where(and(eq(workspaces.ownerUserId, targetUserId), eq(workspaces.kind, "personal"))).limit(1);
  if (!ws) throw new Error("This customer has no workspace yet.");
  // One open view per administrator: an earlier one is closed first.
  await d.update(adminViews).set({ endedAt: new Date() }).where(and(eq(adminViews.adminUserId, admin.id), isNull(adminViews.endedAt)));
  const expiresAt = viewExpiry();
  const [row] = await d.insert(adminViews).values({ adminUserId: admin.id, targetUserId, targetWorkspaceId: ws.id, expiresAt }).returning();
  await recordAudit({ admin, action: "view_start", targetUserId, targetWorkspaceId: ws.id, targetLabel: target.name ?? target.email, newValue: { expiresAt: expiresAt.toISOString() }, request });
  return { id: row.id, cookie: encodeViewCookie(row.id, expiresAt), expiresAt, customerName: target.name ?? target.email };
}

export async function endView(admin: AppUser, request: Request | null): Promise<{ customerId: string | null }> {
  const jar = await cookies();
  const parsed = parseViewCookie(jar.get(VIEW_COOKIE)?.value, 0); // expired cookies still name the row to close
  let customerId: string | null = null;
  if (parsed) {
    const d = db();
    const [row] = await d.select().from(adminViews).where(and(eq(adminViews.id, parsed.id), eq(adminViews.adminUserId, admin.id))).limit(1);
    if (row) {
      customerId = row.targetUserId;
      if (!row.endedAt) {
        await d.update(adminViews).set({ endedAt: new Date() }).where(eq(adminViews.id, row.id));
        const [target] = await d.select({ name: profiles.name, email: profiles.email }).from(profiles).where(eq(profiles.userId, row.targetUserId)).limit(1);
        await recordAudit({ admin, action: "view_end", targetUserId: row.targetUserId, targetWorkspaceId: row.targetWorkspaceId, targetLabel: target?.name ?? target?.email ?? null, request });
      }
    }
  }
  return { customerId };
}

/** The customer's read-only scope while the administrator's view cookie names a live session; null otherwise. */
export async function viewScopeFor(user: AppUser): Promise<Scope | null> {
  let value: string | undefined;
  try {
    value = (await cookies()).get(VIEW_COOKIE)?.value;
  } catch {
    return null;
  }
  const parsed = parseViewCookie(value);
  if (!parsed || !isAdmin(user.email)) return null;
  const d = db();
  const [row] = await d.select().from(adminViews).where(and(eq(adminViews.id, parsed.id), eq(adminViews.adminUserId, user.id), isNull(adminViews.endedAt), gt(adminViews.expiresAt, new Date()))).limit(1);
  if (!row) return null;
  const [target] = await d.select().from(profiles).where(eq(profiles.userId, row.targetUserId)).limit(1);
  const [ws] = await d.select().from(workspaces).where(eq(workspaces.id, row.targetWorkspaceId)).limit(1);
  if (!target || !ws) return null;
  const customer: AppUser = { id: target.userId, email: target.email, emailVerified: true, name: target.name ?? undefined };
  return {
    userId: target.userId,
    user: customer,
    workspaceId: ws.id,
    role: "owner",
    workspaceName: ws.name,
    planKey: ws.planKey,
    workspaceKind: ws.kind as "personal" | "team",
    readOnly: true,
    viewing: { id: row.id, adminUserId: user.id, adminEmail: user.email, customerName: target.name ?? target.email, customerId: target.userId, expiresAt: row.expiresAt.toISOString() },
  };
}
