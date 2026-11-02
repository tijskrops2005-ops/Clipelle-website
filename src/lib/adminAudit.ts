import "server-only";
import { and, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import { adminAuditLog, db } from "@/lib/db";
import type { AppUser } from "@/lib/auth";
import { clientIp, hashIp } from "@/lib/rateLimit";

/**
 * The admin audit log (2 Nov 2026): every action an administrator takes on a customer. Written by
 * the admin routes, read on /admin/audit. The IP is stored as a hash, never raw.
 */
export type AuditAction = "credits_adjust" | "limits_set" | "view_start" | "view_end" | "project_cancel" | "project_retry" | "account_delete_final";

export const AUDIT_ACTIONS: { key: AuditAction; label: string }[] = [
  { key: "credits_adjust", label: "Credits adjusted" },
  { key: "limits_set", label: "Limits set" },
  { key: "view_start", label: "View as customer started" },
  { key: "view_end", label: "View as customer ended" },
  { key: "project_cancel", label: "Project cancelled" },
  { key: "project_retry", label: "Project retried" },
  { key: "account_delete_final", label: "Account removed" },
];

export function auditActionLabel(key: string) {
  return AUDIT_ACTIONS.find((a) => a.key === key)?.label ?? key;
}

export async function recordAudit(input: { admin: AppUser; action: AuditAction; targetUserId?: string | null; targetWorkspaceId?: string | null; targetLabel?: string | null; oldValue?: unknown; newValue?: unknown; reason?: string | null; request?: Request | null }) {
  const ip = input.request ? clientIp(input.request) : null;
  await db().insert(adminAuditLog).values({
    adminUserId: input.admin.id,
    adminEmail: input.admin.email,
    action: input.action,
    targetUserId: input.targetUserId ?? null,
    targetWorkspaceId: input.targetWorkspaceId ?? null,
    targetLabel: input.targetLabel ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    reason: input.reason ?? null,
    ipHash: ip ? hashIp(ip) : null,
  });
}

export type AuditFilters = { admin?: string; action?: string; customer?: string; from?: string; to?: string };

export type AuditEntry = { id: string; adminEmail: string; action: string; targetUserId: string | null; targetWorkspaceId: string | null; targetLabel: string | null; oldValue: unknown; newValue: unknown; reason: string | null; createdAt: string };

/** The newest entries first, filtered by admin address, action, customer (name/e-mail/user id) and date. */
export async function listAudit(filters: AuditFilters, limit = 200): Promise<AuditEntry[]> {
  const where: SQL[] = [];
  if (filters.admin) where.push(ilike(adminAuditLog.adminEmail, `%${filters.admin}%`));
  if (filters.action) where.push(eq(adminAuditLog.action, filters.action));
  if (filters.customer) where.push(or(ilike(adminAuditLog.targetLabel, `%${filters.customer}%`), eq(adminAuditLog.targetUserId, filters.customer))!);
  if (filters.from && !Number.isNaN(Date.parse(filters.from))) where.push(gte(adminAuditLog.createdAt, new Date(filters.from)));
  if (filters.to && !Number.isNaN(Date.parse(filters.to))) where.push(lt(adminAuditLog.createdAt, new Date(new Date(filters.to).getTime() + 86_400_000)));
  const rows = await db().select().from(adminAuditLog).where(where.length ? and(...where) : undefined).orderBy(desc(adminAuditLog.createdAt)).limit(limit);
  return rows.map((r) => ({ id: r.id, adminEmail: r.adminEmail, action: r.action, targetUserId: r.targetUserId, targetWorkspaceId: r.targetWorkspaceId, targetLabel: r.targetLabel, oldValue: r.oldValue, newValue: r.newValue, reason: r.reason, createdAt: r.createdAt.toISOString() }));
}

/** The administrators that appear in the log, for the filter. */
export async function auditAdmins(): Promise<string[]> {
  const rows = await db().selectDistinct({ email: adminAuditLog.adminEmail }).from(adminAuditLog);
  return rows.map((r) => r.email).sort();
}
