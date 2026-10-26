import "server-only";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { creditLedger, db } from "@/lib/db";

/**
 * Credit ledger per WORKSPACE (21 October 2026; before that per user). Rows are grants (positive),
 * reservations (negative, pending), settlements and refunds; `userId` is the acting user, so the
 * owner can see usage per member. The balance is the sum of non-expired rows. A project reserves
 * credits before it starts (startProject), settles when it completes and is refunded when it fails.
 * reserveSpend/settleSpend (the cost guard) are untouched.
 */
export type LedgerKind = "grant_free" | "grant_subscription" | "grant_topup" | "grant_manual" | "reserve" | "settle" | "refund" | "expire";

export async function getCreditBalance(workspaceId: string): Promise<number> {
  const [row] = await db()
    .select({ total: sql<number>`coalesce(sum(${creditLedger.credits}), 0)` })
    .from(creditLedger)
    .where(and(eq(creditLedger.workspaceId, workspaceId), or(isNull(creditLedger.expiresAt), gt(creditLedger.expiresAt, new Date()))));
  return Number(row?.total ?? 0);
}

export async function listLedger(workspaceId: string, limit = 100) {
  return db().select().from(creditLedger).where(eq(creditLedger.workspaceId, workspaceId)).orderBy(desc(creditLedger.createdAt)).limit(limit);
}

export class CreditError extends Error {
  constructor(message: string, public readonly status = 402, public readonly code = "insufficient_credits") {
    super(message);
    this.name = "CreditError";
  }
}

/** Adds credits to a workspace; `expiresAt` null means they never expire. Idempotent on `reference`. */
export async function grantCredits(input: { workspaceId: string; userId: string; credits: number; kind: LedgerKind; note?: string; expiresAt?: Date | null; reference?: string }) {
  if (input.reference) {
    const [twin] = await db().select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.workspaceId, input.workspaceId), eq(creditLedger.reference, input.reference))).limit(1);
    if (twin) return twin.id;
  }
  const [row] = await db().insert(creditLedger).values({ workspaceId: input.workspaceId, userId: input.userId, credits: Math.round(input.credits), kind: input.kind, note: input.note, expiresAt: input.expiresAt ?? null, reference: input.reference ?? null }).returning({ id: creditLedger.id });
  return row.id;
}

/** Reserves credits for a project from the workspace balance: throws when too low. Idempotent per project. */
export async function reserveCredits(workspaceId: string, userId: string, projectId: string, credits: number, note: string) {
  const [existing] = await db().select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.projectId, projectId), eq(creditLedger.kind, "reserve"))).limit(1);
  if (existing) return existing.id;
  const balance = await getCreditBalance(workspaceId);
  if (balance < credits) throw new CreditError(`This needs ${credits} credits and the workspace has ${balance}. Add credits in Billing to start it.`);
  const [row] = await db().insert(creditLedger).values({ workspaceId, userId, projectId, credits: -Math.round(credits), kind: "reserve", note }).returning({ id: creditLedger.id });
  return row.id;
}

/**
 * Settles a reservation against what was really used: `usedCredits` replaces the reservation.
 * Unused reserved credits come back; a failed project is refunded in full (usedCredits = 0).
 */
export async function settleCredits(projectId: string, usedCredits: number, note: string) {
  const [reserve] = await db().select().from(creditLedger).where(and(eq(creditLedger.projectId, projectId), eq(creditLedger.kind, "reserve"))).limit(1);
  if (!reserve) return;
  const [done] = await db().select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.projectId, projectId), or(eq(creditLedger.kind, "settle"), eq(creditLedger.kind, "refund")))).limit(1);
  if (done) return;
  const reserved = -reserve.credits;
  const diff = reserved - Math.max(0, Math.round(usedCredits));
  await db().insert(creditLedger).values({ workspaceId: reserve.workspaceId, userId: reserve.userId, projectId, credits: diff, kind: usedCredits > 0 ? "settle" : "refund", note });
}

/** Credits charged for one project: the net of its reserve, settle and refund rows; undefined without rows. */
export async function projectCreditsUsed(projectId: string): Promise<number | undefined> {
  const rows = await db().select({ credits: creditLedger.credits }).from(creditLedger).where(eq(creditLedger.projectId, projectId));
  if (rows.length === 0) return undefined;
  return Math.max(0, -rows.reduce((sum, r) => sum + r.credits, 0));
}
