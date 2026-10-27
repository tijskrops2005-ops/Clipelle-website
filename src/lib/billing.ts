import "server-only";
import { count, eq, gte, sql } from "drizzle-orm";
import { db, profiles } from "@/lib/db";
import { ALL_PLANS, CREDIT_EXPIRY, FREE_AD, FREE_AD_CREDITS, TOPUPS, planByKey } from "@/lib/plans";
import { grantCredits } from "@/lib/credits";
import { updateWorkspaceBilling, workspaceByCustomer } from "@/lib/workspaces";
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

const FREE_AD_LOCK = 7_310_001;

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * The one free ad: granted once per verified account into the user's PERSONAL workspace, limited by a
 * global daily cap (FREE_ADS_PER_DAY). Idempotent. The count and the grant run in one transaction under
 * an advisory lock, so two servers cannot both pass the cap.
 */
export async function ensureFreeAd(user: AppUser, personalWorkspaceId: string): Promise<FreeAdState> {
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
  await grantCredits({ workspaceId: personalWorkspaceId, userId: user.id, credits: FREE_AD_CREDITS, kind: "grant_free", note: `Free credits (${FREE_AD_CREDITS}): half a minute of translation or one ${FREE_AD.seconds}-second ad`, expiresAt: freeAdExpiry(now), reference: `free:${user.id}` });
  return { granted: true, capLeft: outcome.capLeft };
}

export function isFreeOnlyCombination(seconds: number, engine: string) {
  return seconds === FREE_AD.seconds && engine === FREE_AD.engine;
}

/** A workspace may start one free trial: never had one, no subscription yet. */
export function trialAvailable(w: { trialStartedAt: Date | null; stripeSubscriptionId: string | null; planKey: string }) {
  return !w.trialStartedAt && !w.stripeSubscriptionId && w.planKey === "free";
}

/**
 * Credits for a plan period, on an invoice paid event. Idempotent on the invoice id. They never expire.
 * An annual invoice pays for twelve months, so it brings twelve months of credits at once (27 Oct 2026;
 * before, a year's payment brought one month's credits).
 */
export async function grantPlanCredits(workspaceId: string, userId: string, planKey: string, invoiceId: string, months = 1) {
  const plan = planByKey(planKey);
  if (!plan || plan.creditsPerMonth === 0) return;
  await grantCredits({ workspaceId, userId, credits: plan.creditsPerMonth * months, kind: "grant_subscription", note: months === 12 ? `${plan.name} plan, 12 months` : `${plan.name} plan`, expiresAt: null, reference: `invoice:${invoiceId}` });
}

export async function grantTopupCredits(workspaceId: string, userId: string, topupKey: string, sessionId: string, customCredits?: number) {
  // A free amount (topupKey "custom"): the number was checked against the amount paid by the webhook.
  const credits = topupKey === "custom" ? customCredits : TOPUPS.find((t) => t.key === topupKey)?.credits;
  if (!credits) return;
  await grantCredits({ workspaceId, userId, credits, kind: "grant_topup", note: topupKey === "custom" ? `${credits} credits` : `${credits} credits pack`, expiresAt: null, reference: `checkout:${sessionId}` });
}

/** Credits bought by auto-reload, once per paid invoice. */
export async function grantAutoReloadCredits(workspaceId: string, userId: string, credits: number, invoiceId: string) {
  await grantCredits({ workspaceId, userId, credits, kind: "grant_topup", note: `${credits} credits (auto-reload)`, expiresAt: null, reference: `autoreload:${invoiceId}` });
}

export async function setPlan(workspaceId: string, patch: { planKey?: string; stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string | null; currentPeriodEnd?: Date | null; trialStartedAt?: Date }) {
  await updateWorkspaceBilling(workspaceId, patch);
}

export { workspaceByCustomer };
export const PLAN_KEYS = ALL_PLANS.map((p) => p.key);
