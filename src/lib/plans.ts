import { AD_LENGTHS, DEFAULTS, estimateAdCost, estimateTranslateCost, type PresenterEngine } from "@/lib/pricing";
import type { TranslationQuality } from "@/lib/types";

/**
 * THE source for credits, plans and prices. Browser-safe (no secrets).
 *
 * One simple rule since 25 Oct 2026 (translation is the main product): a credit is a second of
 * finished video.
 *   - Translation, Speed: 1 credit per second per language (at least 10); Precision: 2; enhancement adds 1.
 *   - Ad, Standard presenter: 2 credits per second (at least 30); Premium: 6 (at least 60).
 * Plans are sold in minutes of Speed translation (60 credits a minute), a bigger plan slightly
 * cheaper per minute. The margin rule: on every plan, every product must earn at least MIN_MARGIN ×
 * its provider cost (from the same estimates the forms show). Translation is the tightest; ads
 * earn more. `docs/pricing-model.md` §0 has the table; `npx tsx scripts/pricing-table.ts` prints it.
 */

export const CREDIT_RULES = {
  translate: { speed: 1, precision: 2, enhance: 1 },
  /** Every language version costs at least this (the quality check has a fixed part per video). */
  translateMinimum: 10,
  ad: { avatar_iii: 2, avatar_iv: 6 },
  adMinimum: { avatar_iii: 30, avatar_iv: 60 },
} as const;

/** Free start (25 Oct 2026): 30 credits after e-mail verification, half a minute of Speed translation or one 10-second Standard ad. */
export const FREE_CREDITS = 30;

/** No plan may sell any product below this multiple of its provider cost. */
export const MIN_MARGIN = 1.7;
/** Annual billing: pay for ten months, get twelve. */
export const ANNUAL_MONTHS_CHARGED = 10;

/** Credits one ad costs: seconds at the chosen pace × the engine's rate, never below the minimum. */
export function adCredits(input: { seconds: number; engine: PresenterEngine; speed?: number }) {
  const seconds = Math.ceil(input.seconds / (input.speed && input.speed > 0 ? input.speed : 1));
  return Math.max(CREDIT_RULES.adMinimum[input.engine], seconds * CREDIT_RULES.ad[input.engine]);
}

/** Credits per language version of a translation: seconds × the quality's rate (+1 per second with enhancement). */
export function translateCredits(input: { seconds: number; quality: TranslationQuality; enhance: boolean; languages?: number; hasSourceTranscript?: boolean }) {
  return Math.max(CREDIT_RULES.translateMinimum, Math.ceil(input.seconds) * (CREDIT_RULES.translate[input.quality] + (input.enhance ? CREDIT_RULES.translate.enhance : 0)));
}

/**
 * The highest provider cost of one credit across everything a credit can buy (USD): a Speed
 * translation with proofreading and captions is the most expensive per credit. Plan prices are
 * checked against this, so every product keeps at least MIN_MARGIN.
 */
export const CREDIT_COST_USD = Math.round(
  Math.max(
    ...[3, 8, 15, 30, 60, 180].flatMap((seconds) =>
      (["speed", "precision"] as const).flatMap((quality) =>
        [false, true].map((enhance) => estimateTranslateCost({ seconds, quality, enhance, languages: 1, hasSourceTranscript: true }).perLanguageTotal / translateCredits({ seconds, quality, enhance })),
      ),
    ),
    ...AD_LENGTHS.flatMap((seconds) => (["avatar_iii", "avatar_iv"] as const).map((engine) => estimateAdCost({ seconds, clipModel: DEFAULTS.clipModel, engine }).total / adCredits({ seconds, engine }))),
  ) * 10_000,
) / 10_000;

/** Minutes of Speed translation (60 credits each) per plan, a bigger plan a little cheaper per minute. */
export const PLAN_MINUTES: Partial<Record<PlanKey, number>> = { starter: 7, pro: 22, scale: 60, business_249: 96, business_499: 193, business_999: 386 };
/** One-off packs: $0.05 a credit (3 minutes 20 seconds of Speed translation for $10). */
export const TOPUP_USD_PER_CREDIT = 0.05;

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
  const credits = monthlyUsd > 0 ? (PLAN_MINUTES[key] ?? 0) * 60 : 0;
  return {
    key,
    name,
    tagline,
    monthlyUsd,
    // Whole dollars (25 Oct 2026): ten months spread over twelve, rounded to the nearest dollar ($15.83 → $16).
    annualMonthlyUsd: Math.round((monthlyUsd * ANNUAL_MONTHS_CHARGED) / 12),
    creditsPerMonth: credits,
    creditsNote: credits > 0 ? `${credits.toLocaleString("en-US")} credits per month` : `${FREE_CREDITS} free credits`,
    bullets,
    stripeLookup: monthlyUsd > 0 ? { monthly: `reelay_${key}_monthly`, annual: `reelay_${key}_annual` } : undefined,
    ...extra,
  };
}

/** "7 minutes of translation a month, or seven 30-second ads": a 30-second Standard ad costs exactly one minute of translation. */
function minutesBullets(key: PlanKey, extra: string) {
  const m = PLAN_MINUTES[key] ?? 0;
  return [`${m} minutes of translation a month`, `Or ${m} ads of 30 seconds (Standard)`, extra, "Credits never expire"];
}

export const PLANS: Plan[] = [
  plan("free", "Free", "Try it once", 0, ["30 free credits after e-mail verification", "Half a minute of translation, or one 10-second ad", "No card; use them within 30 days"], { creditsNote: "30 free credits" }),
  plan("starter", "Starter", "For a shop translating its first videos", 19, minutesBullets("starter", "Every language, Speed or Precision")),
  plan("pro", "Pro", "For a brand selling in several languages", 59, minutesBullets("pro", "Premium presenter when you want it"), { recommended: true }),
  plan("scale", "Scale", "For agencies and several brands", 159, minutesBullets("scale", "Precision, enhancement and Premium included")),
  plan("enterprise", "Enterprise", "Custom volume and terms", 0, ["Custom credits and billing", "Onboarding and a direct line", "Book a demo to talk"], { creditsNote: "Custom", stripeLookup: undefined }),
];

/**
 * Business: one plan with three credit levels for a team workspace (shared credits, members, no cost
 * per seat). Credits follow PLAN_MINUTES like every subscription.
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

/** The plan a Stripe price belongs to, by its lookup key (monthly or annual); undefined for packs and unknown keys. */
export function planByLookupKey(lookupKey: string | null | undefined): Plan | undefined {
  if (!lookupKey) return undefined;
  return ALL_PLANS.find((p) => p.stripeLookup?.monthly === lookupKey || p.stripeLookup?.annual === lookupKey);
}

export function planByKey(key: string | null | undefined): Plan | undefined {
  return ALL_PLANS.find((p) => p.key === key);
}

export type TopupPack = { key: string; usd: number; credits: number; stripeLookup: string };

/** One-off packs at the top-up margin; the credits never expire. */
export const TOPUPS: TopupPack[] = [10, 25, 50].map((usd) => ({ key: `topup_${usd}`, usd, credits: Math.round(usd / TOPUP_USD_PER_CREDIT), stripeLookup: `reelay_topup_${usd}` }));

/**
 * Expiry (decided 21 October 2026): paid credits (subscriptions and packs) NEVER expire while the
 * account exists, also after a subscription is cancelled; deleting the account forfeits them.
 * The free first ad expires 30 days after it is granted. The plan margins assume every credit is
 * used (planMargin counts the cost of all included credits), so unused credits are never treated
 * as revenue.
 */
export const CREDIT_EXPIRY = { paid: "never" as const, freeAdDays: 30 };

/** The ad the free credits cover exactly (kept for copy and the free-plan rule). */
export const FREE_AD = { seconds: 10, engine: "avatar_iii" as PresenterEngine };
export const FREE_AD_CREDITS = FREE_CREDITS;

export function formatPrice(usd: number) {
  return Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`;
}

/** Reference table for the pricing page: credits per ad length and quality. */
export function adCreditTable() {
  return AD_LENGTHS.map((seconds) => ({ seconds, standard: adCredits({ seconds, engine: "avatar_iii" }), premium: adCredits({ seconds, engine: "avatar_iv" }) }));
}

/** Gross margin of a plan when every credit goes to the most expensive product per credit: (price − cost) / price, and the multiple. */
export function planMargin(p: Plan) {
  if (p.monthlyUsd === 0 || p.creditsPerMonth === 0) return null;
  const cost = p.creditsPerMonth * CREDIT_COST_USD;
  return { cost: Math.round(cost * 100) / 100, gross: Math.round((p.monthlyUsd - cost) * 100) / 100, pct: Math.round(((p.monthlyUsd - cost) / p.monthlyUsd) * 100), multiple: Math.round((p.monthlyUsd / cost) * 100) / 100 };
}

/** Price of one minute of Speed translation on a plan (USD). */
export function usdPerTranslateMinute(p: Plan) {
  return p.creditsPerMonth > 0 ? Math.round((p.monthlyUsd / (p.creditsPerMonth / 60)) * 100) / 100 : 0;
}
