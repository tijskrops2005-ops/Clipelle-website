import "server-only";
import { count, eq, gte, sql } from "drizzle-orm";
import { db, profiles } from "@/lib/db";
import { CREDIT_EXPIRY, FREE_AD, FREE_AD_CREDITS, PLANS, TOPUPS, planByKey } from "@/lib/plans";
import { grantCredits } from "@/lib/credits";
import type { AppUser } from "@/lib/auth";

/** When the free first ad expires: a fixed number of days after the grant (paid credits never expire). */
export function freeAdExpiry(from: Date) {
  return new Date(from.getTime() + CREDIT_EXPIRY.freeAdDays * 24 * 60 * 60 * 1000);
}

export function freeAdsPerDay() {
  const n = Number(process.env.FREE_ADS_PER_DAY ?? "10");
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

export type FreeAdState = { granted: boolean; reason?: "unverified" | "already" | "cap"; capLeft?: number };

/** Advisory lock id for the daily free-ad counter (any constant; only this code uses it). */
const FREE_AD_LOCK = 7_310_001;

/** Start of the current day in UTC: the cap is a global calendar-day count, the same on every server. */
function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * The one free ad: granted once per verified account as a credit grant worth one 10 s Standard ad,
 * limited by a global daily cap (FREE_ADS_PER_DAY). Idempotent. The count and the grant run in one
 * transaction under an advisory lock, so two servers granting at the same moment cannot both pass
 * the cap (the count lives in profiles.free_ad_granted_at, never in process memory).
 */
export async function ensureFreeAd(user: AppUser): Promise<FreeAdState> {
  if (!user.emailVerified) return { granted: false, reason: "unverified" };
  const d = db();
  const [p] = await d.select({ freeAdGrantedAt: profiles.freeAdGrantedAt }).from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (!p) return { granted: false, reason: "unverified" };
  if (p.freeAdGrantedAt) return { granted: true, reason: "already" };
  const cap = freeAdsPerDay();
  const now = new Date();
  const outcome = await d.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${FREE_AD_LOCK})`);
    const [{ n }] = await tx.select({ n: count() }).from(profiles).where(gte(profiles.freeAdGrantedAt, startOfTodayUtc()));
    if (n >= cap) return { granted: false as const, capLeft: 0 };
    const updated = await tx.update(profiles).set({ freeAdGrantedAt: now, updatedAt: now }).where(eq(profiles.userId, user.id)).returning({ userId: profiles.userId });
    if (updated.length === 0) return { granted: false as const, capLeft: cap - n };
    return { granted: true as const, capLeft: cap - n - 1 };
  });
  if (!outcome.granted) return { granted: false, reason: "cap", capLeft: outcome.capLeft };
  await grantCredits({ userId: user.id, credits: FREE_AD_CREDITS, kind: "grant_free", note: `Free first ad (${FREE_AD.seconds} s, Standard)`, expiresAt: freeAdExpiry(now), reference: `free:${user.id}` });
  return { granted: true, capLeft: outcome.capLeft };
}

/** Whether a free-only account (no paid plan, only the free grant) is limited to the free combination. */
export function isFreeOnlyCombination(seconds: number, engine: string) {
  return seconds === FREE_AD.seconds && engine === FREE_AD.engine;
}

/** Credits for a plan period, on an invoice paid event. Idempotent on the invoice id. They never expire. */
export async function grantPlanCredits(userId: string, planKey: string, invoiceId: string, _periodStart: Date) {
  const plan = planByKey(planKey);
  if (!plan || plan.creditsPerMonth === 0) return;
  await grantCredits({ userId, credits: plan.creditsPerMonth, kind: "grant_subscription", note: `${plan.name} plan`, expiresAt: null, reference: `invoice:${invoiceId}` });
}

export async function grantTopupCredits(userId: string, topupKey: string, sessionId: string) {
  const pack = TOPUPS.find((t) => t.key === topupKey);
  if (!pack) return;
  await grantCredits({ userId, credits: pack.credits, kind: "grant_topup", note: `${pack.credits} credits pack`, expiresAt: null, reference: `checkout:${sessionId}` });
}

export async function setPlan(userId: string, patch: { planKey?: string; stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string | null; currentPeriodEnd?: Date | null }) {
  await db().update(profiles).set({ ...patch, updatedAt: new Date() }).where(eq(profiles.userId, userId));
}

export async function profileByCustomer(customerId: string) {
  const [p] = await db().select().from(profiles).where(eq(profiles.stripeCustomerId, customerId)).limit(1);
  return p ?? null;
}

export const PLAN_KEYS = PLANS.map((p) => p.key);
