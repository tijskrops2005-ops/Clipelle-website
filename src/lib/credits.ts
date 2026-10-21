import "server-only";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { creditLedger, db } from "@/lib/db";

/**
 * Credit ledger per account. Rows are grants (positive), reservations (negative, pending),
 * settlements and refunds. The balance is the sum of non-expired rows. This layer sits next to
 * the cost guard: a project reserves credits before it starts (startProject), settles when it
 * completes and is refunded when it fails. reserveSpend/settleSpend are untouched.
 */
export type LedgerKind = "grant_free" | "grant_subscription" | "grant_topup" | "grant_manual" | "reserve" | "settle" | "refund" | "expire";

export async function getCreditBalance(userId: string): Promise<number> {
  const [row] = await db()
    .select({ total: sql<number>`coalesce(sum(${creditLedger.credits}), 0)` })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), or(isNull(creditLedger.expiresAt), gt(creditLedger.expiresAt, new Date()))));
  return Number(row?.total ?? 0);
}

export async function listLedger(userId: string, limit = 100) {
  return db().select().from(creditLedger).where(eq(creditLedger.userId, userId)).orderBy(desc(creditLedger.createdAt)).limit(limit);
}

export class CreditError extends Error {
  constructor(message: string, public readonly status = 402, public readonly code = "insufficient_credits") {
    super(message);
    this.name = "CreditError";
  }
}

/** Adds credits; `expiresAt` null means they never expire. */
export async function grantCredits(input: { userId: string; credits: number; kind: LedgerKind; note?: string; expiresAt?: Date | null; reference?: string }) {
  if (input.reference) {
    const [twin] = await db().select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.userId, input.userId), eq(creditLedger.reference, input.reference))).limit(1);
    if (twin) return twin.id; // idempotent on the reference (e.g. a Stripe event id)
  }
  const [row] = await db().insert(creditLedger).values({ userId: input.userId, credits: Math.round(input.credits), kind: input.kind, note: input.note, expiresAt: input.expiresAt ?? null, reference: input.reference ?? null }).returning({ id: creditLedger.id });
  return row.id;
}

/** Reserves credits for a project: throws when the balance is too low. Idempotent per project. */
export async function reserveCredits(userId: string, projectId: string, credits: number, note: string) {
  const [existing] = await db().select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.userId, userId), eq(creditLedger.projectId, projectId), eq(creditLedger.kind, "reserve"))).limit(1);
  if (existing) return existing.id;
  const balance = await getCreditBalance(userId);
  if (balance < credits) throw new CreditError(`This needs ${credits} credits and you have ${balance}. Add credits in Billing to start it.`);
  const [row] = await db().insert(creditLedger).values({ userId, projectId, credits: -Math.round(credits), kind: "reserve", note }).returning({ id: creditLedger.id });
  return row.id;
}

/**
 * Settles a reservation against what was really used: `usedCredits` replaces the reservation.
 * Unused reserved credits come back; a failed project is refunded in full (usedCredits = 0).
 */
export async function settleCredits(userId: string, projectId: string, usedCredits: number, note: string) {
  const [reserve] = await db().select().from(creditLedger).where(and(eq(creditLedger.userId, userId), eq(creditLedger.projectId, projectId), eq(creditLedger.kind, "reserve"))).limit(1);
  if (!reserve) return;
  const [done] = await db().select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.projectId, projectId), or(eq(creditLedger.kind, "settle"), eq(creditLedger.kind, "refund")))).limit(1);
  if (done) return; // already settled
  const reserved = -reserve.credits;
  const diff = reserved - Math.max(0, Math.round(usedCredits)); // positive = give back
  await db().insert(creditLedger).values({ userId, projectId, credits: diff, kind: usedCredits > 0 ? "settle" : "refund", note });
}
