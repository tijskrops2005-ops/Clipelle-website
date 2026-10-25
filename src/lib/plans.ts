import { AD_LENGTHS, DEFAULTS, estimateAdCost, estimateTranslateCost, type PresenterEngine } from "@/lib/pricing";
import type { TranslationQuality } from "@/lib/types";

/**
 * THE source for credits, plans and prices. Browser-safe (no secrets).
 *
 * One credit = the provider cost of one second of a Standard-quality ad at the recommended length
 * (30 s Standard ≈ $0.68 all-in → $0.68 / 30 ≈ $0.0227 per credit; see docs/pricing-model.md).
 * Everything else is expressed in that unit from the same estimates the forms show, so the customer
 * sees one number next to the dollar estimate. Prices = provider cost × margin. Since 24 Oct 2026 a
 * bigger plan is cheaper per credit (PLAN_MARGINS: Starter 2.75× … Business 999 2.15×), never below
 * MIN_SUBSCRIPTION_MARGIN; top-up packs stay at 4× (TOPUP_MARGIN). Plan prices are fixed to round
 * numbers; the included credits are derived from the price and the plan's margin.
 */

export const CREDIT_COST_USD = Math.round((estimateAdCost({ seconds: 30, clipModel: DEFAULTS.clipModel, engine: "avatar_iii" }).total / 30) * 10_000) / 10_000;

/** Default subscription margin (used when a plan has no own entry in PLAN_MARGINS). */
export const SUBSCRIPTION_MARGIN = 3;
/** Price ÷ provider cost per plan: the bigger the plan, the cheaper each credit (decided 24 Oct 2026). */
export const PLAN_MARGINS: Partial<Record<PlanKey, number>> = { starter: 2.75, pro: 2.5, scale: 2.25, business_249: 2.25, business_499: 2.2, business_999: 2.15 };
/** No subscription may ever go below this margin on the monthly price (≈ 53% gross). */
export const MIN_SUBSCRIPTION_MARGIN = 2.15;
export const TOPUP_MARGIN = 4;
/**
 * Translations take 80% of their provider cost in credits (decided 24 Oct 2026): translation is the
 * main product and the market prices it per minute far below ads. On every plan the margin on a
 * translation stays at or above MIN_TRANSLATE_MARGIN; packs still keep ≥ 3.2×.
 */
export const TRANSLATE_CREDIT_FACTOR = 0.8;
export const MIN_TRANSLATE_MARGIN = 1.7;
/** Annual billing: pay for ten months, get twelve. */
export const ANNUAL_MONTHS_CHARGED = 10;

/** Credits for a provider cost in USD, rounded up to a whole credit. */
export function creditsForUsd(usd: number) {
  return Math.max(1, Math.ceil(usd / CREDIT_COST_USD));
}

/** Credits one ad costs for the given choices (the same estimate the form shows). */
export function adCredits(input: { seconds: number; engine: PresenterEngine; speed?: number }) {
  return creditsForUsd(estimateAdCost({ seconds: input.seconds, clipModel: DEFAULTS.clipModel, engine: input.engine, speed: input.speed }).total);
}

/** Credits per language version of a translation. */
export function translateCredits(input: { seconds: number; quality: TranslationQuality; enhance: boolean; languages: number; hasSourceTranscript: boolean }) {
  return creditsForUsd(estimateTranslateCost(input).perLanguageTotal * TRANSLATE_CREDIT_FACTOR);
}

/** Credits for the real spend of a finished project: the same rule as its estimate (translations at the translation factor). */
export function creditsForSpend(usd: number, workflow: "ad" | "translate") {
  return creditsForUsd(workflow === "translate" ? usd * TRANSLATE_CREDIT_FACTOR : usd);
}

/** Included credits for a monthly price at the subscription margin, rounded down to tens. */
export function includedCreditsFor(monthlyUsd: number, margin = SUBSCRIPTION_MARGIN) {
  return Math.floor(monthlyUsd / (CREDIT_COST_USD * margin) / 10) * 10;
}

export type PlanKey = "free" | "starter" | "pro" | "scale" | "enterprise" | "business_249" | "business_499" | "business_999";

export type Plan = {
  key: PlanKey;
  name: string;
  tagline: string;
  monthlyUsd: number;
  /** Per month when billed annually (ten months charged). */
  annualMonthlyUsd: number;
  creditsPerMonth: number;
  creditsNote: string;
  bullets: string[];
  /** Stripe lookup keys for the two prices; created by scripts/stripe-setup.ts. */
  stripeLookup?: { monthly: string; annual: string };
  /** Our own recommendation label on the pricing page (one plan at most). Not "most popular", no numbers. */
  recommended?: boolean;
  /**
   * Launch discount: a crossed-out price shown next to the current one, only while `endDate` has not
   * passed. The crossed-out price MUST be a real earlier (or later) price; in the EU it must be the
   * lowest price of the previous 30 days. Default empty. Never invent one.
   */
  listPrice?: { monthlyUsd: number; endDate: string };
  /** Team workspace plan: shared credits, members, no cost per seat. */
  team?: boolean;
};

function plan(key: PlanKey, name: string, tagline: string, monthlyUsd: number, bullets: string[], extra: Partial<Plan> = {}): Plan {
  const credits = monthlyUsd > 0 ? includedCreditsFor(monthlyUsd, PLAN_MARGINS[key] ?? SUBSCRIPTION_MARGIN) : 0;
  return {
    key,
    name,
    tagline,
    monthlyUsd,
    // Whole dollars (25 Oct 2026): ten months spread over twelve, rounded to the nearest dollar ($15.83 → $16).
    annualMonthlyUsd: Math.round((monthlyUsd * ANNUAL_MONTHS_CHARGED) / 12),
    creditsPerMonth: credits,
    creditsNote: credits > 0 ? `${credits.toLocaleString("en-US")} credits per month` : "One free 10-second ad",
    bullets,
    stripeLookup: monthlyUsd > 0 ? { monthly: `reelay_${key}_monthly`, annual: `reelay_${key}_annual` } : undefined,
    ...extra,
  };
}

export const PLANS: Plan[] = [
  plan("free", "Free", "Try it once", 0, ["One 10-second ad, Standard presenter", "After e-mail verification, no card", "Use it within 30 days"], { creditsNote: "One free 10-second ad" }),
  plan("starter", "Starter", "For a shop testing its first ads", 19, ["Ten 30-second Standard ads a month", "Translations, all languages", "Credits never expire"]),
  plan("pro", "Pro", "For a brand posting every week", 59, ["About thirty-four 30-second Standard ads a month", "Premium presenter when you want it", "Credits never expire"], { recommended: true }),
  plan("scale", "Scale", "For agencies and several brands", 159, ["Over a hundred 30-second Standard ads a month", "Premium presenter and translations included", "Credits never expire"]),
  plan("enterprise", "Enterprise", "Custom volume and terms", 0, ["Custom credits and billing", "Onboarding and a direct line", "Book a demo to talk"], { creditsNote: "Custom", stripeLookup: undefined }),
];

/**
 * Business: one plan with three credit levels for a team workspace (shared credits, members, no cost
 * per seat). Prices follow the same rule as every subscription: credits = includedCreditsFor(price) at 3×.
 */
export const BUSINESS_TIERS: Plan[] = [249, 499, 999].map((usd) =>
  plan(`business_${usd}` as PlanKey, "Business", "For teams sharing one credit pool", usd, ["Shared credits for the whole team", "Members with their own sign-in, no cost per seat", "Per-member usage for the owner", "API keys for the workspace", "Credits never expire"], { team: true }),
);
export const ALL_PLANS: Plan[] = [...PLANS, ...BUSINESS_TIERS];

export const isTeamPlan = (key: string | null | undefined) => BUSINESS_TIERS.some((t) => t.key === key);
export const isPaidPlan = (key: string | null | undefined) => ALL_PLANS.some((p) => p.key === key && p.monthlyUsd > 0);

/** The crossed-out launch price, only while its end date has not passed. */
export function activeListPrice(p: Plan, now = new Date()) {
  if (!p.listPrice) return null;
  return new Date(p.listPrice.endDate).getTime() > now.getTime() ? p.listPrice.monthlyUsd : null;
}

/** The real yearly saving of a plan: twelve monthly prices minus the annual total. */
export function annualSaving(p: Plan) {
  return Math.round((p.monthlyUsd * 12 - p.annualMonthlyUsd * 12) * 100) / 100;
}

export function planByKey(key: string | null | undefined): Plan | undefined {
  return ALL_PLANS.find((p) => p.key === key);
}

export type TopupPack = { key: string; usd: number; credits: number; stripeLookup: string };

/** One-off packs at the top-up margin; the credits never expire. */
export const TOPUPS: TopupPack[] = [10, 25, 50].map((usd) => ({ key: `topup_${usd}`, usd, credits: includedCreditsFor(usd, TOPUP_MARGIN), stripeLookup: `reelay_topup_${usd}` }));

/**
 * Expiry (decided 21 October 2026): paid credits (subscriptions and packs) NEVER expire while the
 * account exists, also after a subscription is cancelled; deleting the account forfeits them.
 * The free first ad expires 30 days after it is granted. The plan margins assume every credit is
 * used (planMargin counts the cost of all included credits), so unused credits are never treated
 * as revenue.
 */
export const CREDIT_EXPIRY = { paid: "never" as const, freeAdDays: 30 };

/** Free first ad: the only combination it allows. */
export const FREE_AD = { seconds: 10, engine: "avatar_iii" as PresenterEngine };
export const FREE_AD_CREDITS = adCredits(FREE_AD);

export function formatPrice(usd: number) {
  return Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`;
}

/** Reference table for the pricing page: credits per ad length and quality. */
export function adCreditTable() {
  return AD_LENGTHS.map((seconds) => ({ seconds, standard: adCredits({ seconds, engine: "avatar_iii" }), premium: adCredits({ seconds, engine: "avatar_iv" }) }));
}

/** Gross margin of a plan at the credit cost: (price − cost of all included credits) / price. */
export function planMargin(p: Plan) {
  if (p.monthlyUsd === 0 || p.creditsPerMonth === 0) return null;
  const cost = p.creditsPerMonth * CREDIT_COST_USD;
  return { cost: Math.round(cost * 100) / 100, gross: Math.round((p.monthlyUsd - cost) * 100) / 100, pct: Math.round(((p.monthlyUsd - cost) / p.monthlyUsd) * 100) };
}
