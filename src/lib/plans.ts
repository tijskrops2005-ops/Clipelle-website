import { AD_LENGTHS, DEFAULTS, estimateAdCost, estimateTranslateCost, type PresenterEngine } from "@/lib/pricing";
import type { TranslationQuality } from "@/lib/types";

/**
 * THE source for credits, plans and prices. Browser-safe (no secrets).
 *
 * One credit = the provider cost of one second of a Standard-quality ad at the recommended length
 * (30 s Standard ≈ $0.68 all-in → $0.68 / 30 ≈ $0.0227 per credit; see docs/pricing-model.md).
 * Everything else is expressed in that unit from the same estimates the forms show, so the customer
 * sees one number next to the dollar estimate. Prices = provider cost × margin:
 * subscriptions 3× (SUBSCRIPTION_MARGIN), top-up packs 4× (TOPUP_MARGIN). Plan prices are fixed to
 * round numbers; the included credits are derived from the price so the margin is never below target.
 */

export const CREDIT_COST_USD = Math.round((estimateAdCost({ seconds: 30, clipModel: DEFAULTS.clipModel, engine: "avatar_iii" }).total / 30) * 10_000) / 10_000;

export const SUBSCRIPTION_MARGIN = 3;
export const TOPUP_MARGIN = 4;
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
  return creditsForUsd(estimateTranslateCost(input).perLanguageTotal);
}

/** Included credits for a monthly price at the subscription margin, rounded down to tens. */
export function includedCreditsFor(monthlyUsd: number, margin = SUBSCRIPTION_MARGIN) {
  return Math.floor(monthlyUsd / (CREDIT_COST_USD * margin) / 10) * 10;
}

export type PlanKey = "free" | "starter" | "pro" | "scale" | "enterprise";

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
  highlight?: boolean;
  /** Stripe lookup keys for the two prices; created by scripts/stripe-setup.ts. */
  stripeLookup?: { monthly: string; annual: string };
};

function plan(key: PlanKey, name: string, tagline: string, monthlyUsd: number, bullets: string[], extra: Partial<Plan> = {}): Plan {
  const credits = monthlyUsd > 0 ? includedCreditsFor(monthlyUsd) : 0;
  return {
    key,
    name,
    tagline,
    monthlyUsd,
    annualMonthlyUsd: Math.round((monthlyUsd * ANNUAL_MONTHS_CHARGED) / 12 * 100) / 100,
    creditsPerMonth: credits,
    creditsNote: credits > 0 ? `${credits.toLocaleString("en-US")} credits per month` : "One free 10-second ad",
    bullets,
    stripeLookup: monthlyUsd > 0 ? { monthly: `reelay_${key}_monthly`, annual: `reelay_${key}_annual` } : undefined,
    ...extra,
  };
}

export const PLANS: Plan[] = [
  plan("free", "Free", "Try it once", 0, ["One 10-second ad, Standard presenter", "After e-mail verification, no card", "All features of the form"], { creditsNote: "One free 10-second ad" }),
  plan("starter", "Starter", "For a shop testing its first ads", 19, ["About nine 30-second Standard ads a month", "Translations, all languages", "Credits valid this month and the next"]),
  plan("pro", "Pro", "For a brand posting every week", 59, ["About twenty-eight 30-second Standard ads a month", "Premium presenter when you want it", "Credits valid this month and the next"], { highlight: true }),
  plan("scale", "Scale", "For agencies and several brands", 159, ["About seventy-five 30-second Standard ads a month", "Priority support", "Credits valid this month and the next"]),
  plan("enterprise", "Enterprise", "Custom volume and terms", 0, ["Custom credits and billing", "Onboarding and a direct line", "Book a demo to talk"], { creditsNote: "Custom", stripeLookup: undefined }),
];

export function planByKey(key: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}

export type TopupPack = { key: string; usd: number; credits: number; stripeLookup: string };

/** One-off packs at the top-up margin; credits valid for a year. */
export const TOPUPS: TopupPack[] = [10, 25, 50].map((usd) => ({ key: `topup_${usd}`, usd, credits: includedCreditsFor(usd, TOPUP_MARGIN), stripeLookup: `reelay_topup_${usd}` }));

/** How long credits stay valid, in months after the month they were issued. */
export const CREDIT_VALIDITY = { subscription: 1, topup: 12, free: 1 } as const;

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
