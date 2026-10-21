import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { db, profiles } from "@/lib/db";
import { CREDIT_VALIDITY, FREE_AD, FREE_AD_CREDITS, PLANS, TOPUPS, planByKey } from "@/lib/plans";
import { grantCredits } from "@/lib/credits";
import type { AppUser } from "@/lib/auth";

/** End of the validity window: the month of `from` plus `months` more, last millisecond. */
export function validUntil(from: Date, months: number) {
  return new Date(from.getFullYear(), from.getMonth() + months + 1, 1, 0, 0, 0, -1);
}

export function freeAdsPerDay() {
  const n = Number(process.env.FREE_ADS_PER_DAY ?? "10");
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

export type FreeAdState = { granted: boolean; reason?: "unverified" | "already" | "cap"; capLeft?: number };

/**
 * The one free ad: granted once per verified account as a credit grant worth one 10 s Standard ad,
 * limited by a global daily cap (FREE_ADS_PER_DAY). Idempotent.
 */
export async function ensureFreeAd(user: AppUser): Promise<FreeAdState> {
  if (!user.emailVerified) return { granted: false, reason: "unverified" };
  const d = db();
  const [p] = await d.select({ freeAdGrantedAt: profiles.freeAdGrantedAt }).from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (!p) return { granted: false, reason: "unverified" };
  if (p.freeAdGrantedAt) return { granted: true, reason: "already" };
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [{ n }] = await d.select({ n: count() }).from(profiles).where(gte(profiles.freeAdGrantedAt, since));
  const cap = freeAdsPerDay();
  if (n >= cap) return { granted: false, reason: "cap", capLeft: 0 };
  const now = new Date();
  await d.update(profiles).set({ freeAdGrantedAt: now, updatedAt: now }).where(and(eq(profiles.userId, user.id)));
  await grantCredits({ userId: user.id, credits: FREE_AD_CREDITS, kind: "grant_free", note: `Free first ad (${FREE_AD.seconds} s, Standard)`, expiresAt: validUntil(now, CREDIT_VALIDITY.free), reference: `free:${user.id}` });
  return { granted: true, capLeft: cap - n - 1 };
}

/** Whether a free-only account (no paid plan, only the free grant) is limited to the free combination. */
export function isFreeOnlyCombination(seconds: number, engine: string) {
  return seconds === FREE_AD.seconds && engine === FREE_AD.engine;
}

/** Credits for a plan period, on an invoice paid event. Idempotent on the invoice id. */
export async function grantPlanCredits(userId: string, planKey: string, invoiceId: string, periodStart: Date) {
  const plan = planByKey(planKey);
  if (!plan || plan.creditsPerMonth === 0) return;
  await grantCredits({ userId, credits: plan.creditsPerMonth, kind: "grant_subscription", note: `${plan.name} plan`, expiresAt: validUntil(periodStart, CREDIT_VALIDITY.subscription), reference: `invoice:${invoiceId}` });
}

export async function grantTopupCredits(userId: string, topupKey: string, sessionId: string) {
  const pack = TOPUPS.find((t) => t.key === topupKey);
  if (!pack) return;
  await grantCredits({ userId, credits: pack.credits, kind: "grant_topup", note: `${pack.credits} credits pack`, expiresAt: validUntil(new Date(), CREDIT_VALIDITY.topup), reference: `checkout:${sessionId}` });
}

export async function setPlan(userId: string, patch: { planKey?: string; stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string | null; currentPeriodEnd?: Date | null }) {
  await db().update(profiles).set({ ...patch, updatedAt: new Date() }).where(eq(profiles.userId, userId));
}

export async function profileByCustomer(customerId: string) {
  const [p] = await db().select().from(profiles).where(eq(profiles.stripeCustomerId, customerId)).limit(1);
  return p ?? null;
}

export const PLAN_KEYS = PLANS.map((p) => p.key);
