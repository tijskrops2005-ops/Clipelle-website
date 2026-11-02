import "server-only";
import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import { apiKeys, assets, db, profiles, projects, workspaces } from "@/lib/db";
import { deleteAccountData } from "@/lib/data/profile";
import { adminCancelProject } from "@/lib/admin";
import { recordAudit } from "@/lib/adminAudit";
import { deletionDate, DELETION_GRACE_DAYS, deletionDue } from "@/lib/accountDeletion";
import { deleteObject } from "@/lib/storage";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/auth";

/**
 * Account deletion with a way back (2 Nov 2026). A request closes the account at once (subscription
 * cancelled at the end of the paid period, API keys revoked, running projects stopped safely) and
 * schedules the removal 30 days later; signing in before then shows a banner with Restore. The daily
 * job removes what is due: files, projects, ledger, workspace, profile and the sign-in. Purchases
 * stay (invoices must be kept); they no longer point at a person once the profile is gone.
 */
export async function requestDeletion(user: AppUser) {
  const d = db();
  const now = new Date();
  await d.update(profiles).set({ deletionRequestedAt: now, updatedAt: now }).where(and(eq(profiles.userId, user.id), isNull(profiles.deletionRequestedAt)));
  // The subscription ends with the paid period; the plan stays until then (restoring keeps it).
  const own = await d.select().from(workspaces).where(and(eq(workspaces.ownerUserId, user.id), eq(workspaces.kind, "personal")));
  for (const w of own) {
    if (w.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe().subscriptions.update(w.stripeSubscriptionId, { cancel_at_period_end: true });
        await d.update(workspaces).set({ subscriptionStatus: "canceling", updatedAt: now }).where(eq(workspaces.id, w.id));
      } catch {
        // Stripe unreachable: the portal still offers cancellation; the job will not remove a paid-up account's invoices anyway.
      }
    }
    await d.update(apiKeys).set({ revokedAt: now }).where(and(eq(apiKeys.workspaceId, w.id), isNull(apiKeys.revokedAt)));
  }
  await d.update(apiKeys).set({ revokedAt: now }).where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)));
  const running = await d.select({ id: projects.id }).from(projects).where(and(eq(projects.ownerId, user.id), inArray(projects.status, ["processing", "review"])));
  for (const p of running) await adminCancelProject(p.id, "Stopped because the account is being closed.").catch(() => undefined);
  return { deletionAt: deletionDate(now) };
}

export async function restoreAccount(userId: string) {
  await db().update(profiles).set({ deletionRequestedAt: null, updatedAt: new Date() }).where(eq(profiles.userId, userId));
}

export async function deletionState(userId: string): Promise<{ requestedAt: Date; deletionAt: Date } | null> {
  const [p] = await db().select({ at: profiles.deletionRequestedAt }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return p?.at ? { requestedAt: p.at, deletionAt: deletionDate(p.at) } : null;
}

const SYSTEM: AppUser = { id: "system", email: "system@clipelle", emailVerified: true, name: "Scheduled job" };

/** Removes every account whose 30 days are over. Returns the user ids removed. */
export async function purgeDueAccounts(now = new Date()): Promise<string[]> {
  const d = db();
  const due = await d.select().from(profiles).where(lt(profiles.deletionRequestedAt, new Date(now.getTime() - DELETION_GRACE_DAYS * 86_400_000)));
  const removed: string[] = [];
  for (const p of due) {
    if (!deletionDue(p.deletionRequestedAt, now)) continue;
    // Files first (best effort), then the rows, then the sign-in.
    const owned = await d.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, p.userId));
    if (owned.length) {
      const files = await d.select({ path: assets.storagePath }).from(assets).where(inArray(assets.projectId, owned.map((o) => o.id)));
      for (const f of files) await deleteObject(f.path).catch(() => undefined);
    }
    await deleteAccountData(p.userId);
    await supabaseAdmin().auth.admin.deleteUser(p.userId).catch(() => undefined);
    await recordAudit({ admin: SYSTEM, action: "account_delete_final", targetUserId: p.userId, targetLabel: p.email, oldValue: { requestedAt: p.deletionRequestedAt?.toISOString() }, newValue: { removedAt: now.toISOString() } }).catch(() => undefined);
    removed.push(p.userId);
  }
  return removed;
}
