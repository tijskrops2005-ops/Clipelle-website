import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { apiKeys, costEntries, creditLedger, db, profiles, projects, purchases, workspaceMembers, workspaces } from "@/lib/db";
import { chargeOf } from "@/lib/services/costGuard";
import type { CustomerRow } from "@/lib/customerFilters";
import type { CustomerLimits } from "@/lib/customerLimits";

/**
 * Customer data for the admin pages (2 Nov 2026): one row per account from profiles, the personal
 * workspace, the credit ledger and the purchases table. Read-only here; changes go through the
 * admin routes, which also write the audit log.
 */
export async function listCustomers(): Promise<CustomerRow[]> {
  const d = db();
  const people = await d.select().from(profiles).orderBy(desc(profiles.createdAt));
  if (people.length === 0) return [];
  const personal = await d.select().from(workspaces).where(eq(workspaces.kind, "personal"));
  const wsByOwner = new Map(personal.map((w) => [w.ownerUserId, w]));
  const wsIds = personal.map((w) => w.id);
  const balances = wsIds.length ? await d.select({ workspaceId: creditLedger.workspaceId, balance: sql<number>`coalesce(sum(${creditLedger.credits}), 0)` }).from(creditLedger).where(inArray(creditLedger.workspaceId, wsIds)).groupBy(creditLedger.workspaceId) : [];
  const balanceByWs = new Map(balances.map((b) => [b.workspaceId, Number(b.balance)]));
  const paid = wsIds.length
    ? await d
        .select({ workspaceId: purchases.workspaceId, cents: sql<number>`coalesce(sum(case when ${purchases.status} = 'paid' then ${purchases.amountCents} else 0 end), 0)`, subs: sql<number>`count(*) filter (where ${purchases.kind} = 'subscription')`, topups: sql<number>`count(*) filter (where ${purchases.kind} in ('topup', 'auto_reload'))` })
        .from(purchases)
        .where(inArray(purchases.workspaceId, wsIds))
        .groupBy(purchases.workspaceId)
    : [];
  const paidByWs = new Map(paid.map((p) => [p.workspaceId, p]));
  const lastProject = await d.select({ ownerId: projects.ownerId, at: sql<Date>`max(${projects.createdAt})` }).from(projects).groupBy(projects.ownerId);
  const lastProjectByUser = new Map(lastProject.map((r) => [r.ownerId, r.at ? new Date(r.at).toISOString() : null]));
  return people.map((p) => {
    const ws = wsByOwner.get(p.userId);
    const pay = ws ? paidByWs.get(ws.id) : undefined;
    const seen = [p.lastSeenAt?.toISOString() ?? null, lastProjectByUser.get(p.userId) ?? null].filter((x): x is string => Boolean(x)).sort().pop() ?? null;
    return {
      userId: p.userId,
      workspaceId: ws?.id ?? null,
      name: p.name,
      email: p.email,
      signedUpAt: p.createdAt.toISOString(),
      planKey: ws?.planKey ?? p.planKey,
      subscriptionStatus: ws?.subscriptionStatus ?? null,
      referredBy: p.referredBy,
      balance: ws ? balanceByWs.get(ws.id) ?? 0 : 0,
      paidCents: Number(pay?.cents ?? 0),
      subscriptionPurchases: Number(pay?.subs ?? 0),
      topupPurchases: Number(pay?.topups ?? 0),
      lastActiveAt: seen,
      totpEnabled: p.totpEnabled,
      deletionRequestedAt: p.deletionRequestedAt?.toISOString() ?? null,
    };
  });
}

export type CustomerDetail = {
  row: CustomerRow;
  limits: CustomerLimits;
  videos: number;
  workspaces: { id: string; name: string; kind: string; role: string; members: number; createdAt: string; planKey: string }[];
  apiKeys: { id: string; name: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }[];
  purchases: { id: string; createdAt: string; item: string; credits: number; amountCents: number; currency: string; status: string; termsVersion: string | null; termsAcceptedAt: string | null }[];
  ledgerTotal: number;
  projects: { id: string; name: string; workflow: string; status: string; createdAt: string; credits: number; realCostUsd: number; batchId: string | null }[];
  batches: number;
};

export async function getCustomer(userId: string): Promise<CustomerDetail | null> {
  const row = (await listCustomers()).find((c) => c.userId === userId);
  if (!row) return null;
  const d = db();
  const own = await d.select().from(workspaces).where(eq(workspaces.ownerUserId, userId));
  const memberOf = await d.select({ ws: workspaces, role: workspaceMembers.role }).from(workspaceMembers).innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId)).where(eq(workspaceMembers.userId, userId));
  const all = [...own.map((w) => ({ ws: w, role: "owner" })), ...memberOf.filter((m) => !own.some((w) => w.id === m.ws.id))];
  const ids = all.map((a) => a.ws.id);
  const members = ids.length ? await d.select({ workspaceId: workspaceMembers.workspaceId, n: sql<number>`count(*)` }).from(workspaceMembers).where(inArray(workspaceMembers.workspaceId, ids)).groupBy(workspaceMembers.workspaceId) : [];
  const membersByWs = new Map(members.map((m) => [m.workspaceId, Number(m.n)]));
  const keys = ids.length ? await d.select().from(apiKeys).where(inArray(apiKeys.workspaceId, ids)).orderBy(desc(apiKeys.createdAt)) : [];
  const personal = own.find((w) => w.kind === "personal");
  const bought = personal ? await d.select().from(purchases).where(eq(purchases.workspaceId, personal.id)).orderBy(desc(purchases.createdAt)) : [];
  const [ledgerCount] = personal ? await d.select({ n: sql<number>`count(*)` }).from(creditLedger).where(eq(creditLedger.workspaceId, personal.id)) : [{ n: 0 }];
  const projs = await d.select().from(projects).where(eq(projects.ownerId, userId)).orderBy(desc(projects.createdAt)).limit(200);
  const projIds = projs.map((p) => p.id);
  const credits = projIds.length ? await d.select({ projectId: creditLedger.projectId, used: sql<number>`coalesce(-sum(case when ${creditLedger.kind} in ('reserve','settle','refund') then ${creditLedger.credits} else 0 end), 0)` }).from(creditLedger).where(inArray(creditLedger.projectId, projIds)).groupBy(creditLedger.projectId) : [];
  const creditsByProject = new Map(credits.map((c) => [c.projectId, Number(c.used)]));
  const costs = projIds.length ? await d.select({ projectId: costEntries.projectId, status: costEntries.status, actualUsd: costEntries.actualUsd, estimatedUsd: costEntries.estimatedUsd }).from(costEntries).where(inArray(costEntries.projectId, projIds)) : [];
  const costByProject = new Map<string, number>();
  for (const c of costs) if (c.projectId) costByProject.set(c.projectId, (costByProject.get(c.projectId) ?? 0) + chargeOf(c));
  return {
    row,
    limits: personal?.limits ?? {},
    videos: projs.filter((p) => p.status === "completed").length,
    workspaces: all.map((a) => ({ id: a.ws.id, name: a.ws.name, kind: a.ws.kind, role: a.role, members: membersByWs.get(a.ws.id) ?? (a.ws.kind === "personal" ? 1 : 0), createdAt: a.ws.createdAt.toISOString(), planKey: a.ws.planKey })),
    apiKeys: keys.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, lastUsedAt: k.lastUsedAt?.toISOString() ?? null, revokedAt: k.revokedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString() })),
    purchases: bought.map((b) => ({ id: b.id, createdAt: b.createdAt.toISOString(), item: b.item, credits: b.credits, amountCents: b.amountCents, currency: b.currency, status: b.status, termsVersion: b.termsVersion, termsAcceptedAt: b.termsAcceptedAt?.toISOString() ?? null })),
    ledgerTotal: Number(ledgerCount?.n ?? 0),
    projects: projs.map((p) => ({ id: p.id, name: p.name, workflow: p.workflow, status: p.status, createdAt: p.createdAt.toISOString(), credits: creditsByProject.get(p.id) ?? 0, realCostUsd: Math.round((costByProject.get(p.id) ?? 0) * 100) / 100, batchId: p.batchId ?? null })),
    batches: new Set(projs.map((p) => p.batchId).filter(Boolean)).size,
  };
}

export type LedgerPage = { rows: { id: string; createdAt: string; credits: number; kind: string; note: string | null }[]; total: number };

/** The credit history, 25 at a time, newest first. */
export async function customerLedger(workspaceId: string, offset = 0, limit = 25): Promise<LedgerPage> {
  const d = db();
  const rows = await d.select().from(creditLedger).where(eq(creditLedger.workspaceId, workspaceId)).orderBy(desc(creditLedger.createdAt)).offset(offset).limit(limit);
  const [c] = await d.select({ n: sql<number>`count(*)` }).from(creditLedger).where(eq(creditLedger.workspaceId, workspaceId));
  return { rows: rows.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString(), credits: r.credits, kind: r.kind, note: r.note })), total: Number(c?.n ?? 0) };
}

/** The customer's personal workspace, for routes that change things. */
export async function personalWorkspaceOf(userId: string) {
  const [ws] = await db().select().from(workspaces).where(and(eq(workspaces.ownerUserId, userId), eq(workspaces.kind, "personal"))).limit(1);
  return ws ?? null;
}
