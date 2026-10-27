import "server-only";
import { and, count, desc, eq, gt, gte, like, sql } from "drizzle-orm";
import { creditLedger, db, profiles, workspaces } from "@/lib/db";
import { ANNUAL_MONTHS, annualMonthsDue, annualReference, parseAnnualReference } from "@/lib/annualCredits";
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

/** Credits for a plan period, on an invoice paid event. Idempotent on the invoice id. They never expire. */
export async function grantPlanCredits(workspaceId: string, userId: string, planKey: string, invoiceId: string) {
  const plan = planByKey(planKey);
  if (!plan || plan.creditsPerMonth === 0) return;
  await grantCredits({ workspaceId, userId, credits: plan.creditsPerMonth, kind: "grant_subscription", note: `${plan.name} plan`, expiresAt: null, reference: `invoice:${invoiceId}` });
}

/**
 * One month of an annual plan's credits (27 Oct 2026, Tijs: paid once a year, credits every month).
 * Month 1 comes with the paid invoice, months 2 to 12 from the daily job. Idempotent per month.
 */
export async function grantAnnualMonth(workspaceId: string, userId: string, planKey: string, invoiceId: string, month: number) {
  const plan = planByKey(planKey);
  if (!plan || plan.creditsPerMonth === 0 || month < 1 || month > ANNUAL_MONTHS) return;
  await grantCredits({ workspaceId, userId, credits: plan.creditsPerMonth, kind: "grant_subscription", note: `${plan.name} plan (annual, month ${month} of ${ANNUAL_MONTHS})`, expiresAt: null, reference: annualReference(invoiceId, planKey, month) });
}

/** Subscriptions that still receive their monthly credits; a cancelled plan stops (it is "free" by then). */
const RECEIVING = new Set(["active", "canceling", "past_due"]);

/**
 * The daily job behind annual plans: for the newest annual period of every workspace, adds each month
 * that has started since the payment and has not been granted yet. A period stops when the plan was
 * cancelled or changed (the workspace no longer has that plan), and after month 12. Returns the grants made.
 */
export async function grantDueAnnualCredits(now = new Date()) {
  const since = new Date(now.getTime() - 400 * 86_400_000);
  const starts = await db()
    .select({ workspaceId: creditLedger.workspaceId, reference: creditLedger.reference, createdAt: creditLedger.createdAt })
    .from(creditLedger)
    .where(and(eq(creditLedger.kind, "grant_subscription"), like(creditLedger.reference, "annual:%:1"), gt(creditLedger.createdAt, since)))
    .orderBy(desc(creditLedger.createdAt));
  const seen = new Set<string>();
  let granted = 0;
  for (const start of starts) {
    if (!start.workspaceId || seen.has(start.workspaceId)) continue;
    seen.add(start.workspaceId);
    const period = parseAnnualReference(start.reference);
    if (!period) continue;
    const [ws] = await db().select().from(workspaces).where(eq(workspaces.id, start.workspaceId)).limit(1);
    if (!ws || ws.planKey !== period.planKey || !RECEIVING.has(ws.subscriptionStatus ?? "")) continue;
    const due = annualMonthsDue(start.createdAt, now);
    for (let month = 2; month <= due; month++) {
      const reference = annualReference(period.invoiceId, period.planKey, month);
      const [twin] = await db().select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.workspaceId, ws.id), eq(creditLedger.reference, reference))).limit(1);
      if (twin) continue;
      await grantAnnualMonth(ws.id, ws.ownerUserId, period.planKey, period.invoiceId, month);
      granted++;
    }
  }
  return granted;
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
