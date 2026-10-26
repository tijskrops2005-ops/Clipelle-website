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
  translate: { speed: 1, precision: 2, enhance: 1, removeText: 1 },
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
export function translateCredits(input: { seconds: number; quality: TranslationQuality; enhance: boolean; removeText?: boolean; languages?: number; hasSourceTranscript?: boolean }) {
  const extra = (input.enhance ? CREDIT_RULES.translate.enhance : 0) + (input.removeText ? CREDIT_RULES.translate.removeText : 0);
  return Math.max(CREDIT_RULES.translateMinimum, Math.ceil(input.seconds) * (CREDIT_RULES.translate[input.quality] + extra));
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

/**
 * Minutes of Speed translation (60 credits each) per plan and level (26 Oct 2026, Tijs: "more credits
 * in the same plan"). Every plan has three levels; a higher level of the same plan is a little cheaper
 * per minute, and a plan's top level stays below the next plan's first level, so the features (C)
 * are what an upgrade buys. Every level keeps MIN_MARGIN (tested).
 */
export const PLAN_MINUTES: Partial<Record<PlanKey, number>> = {
  starter: 7, starter_2: 12, starter_3: 17,
  pro: 22, pro_2: 33, pro_3: 44,
  scale: 60, scale_2: 90, scale_3: 120,
  business_249: 96, business_499: 193, business_999: 386,
};
/** One-off packs: $0.05 a credit (3 minutes 20 seconds of Speed translation for $10). */
export const TOPUP_USD_PER_CREDIT = 0.05;

/** The two currencies we sell in: dollars on the English site, euros on /nl (26 Oct 2026). */
export type Currency = "usd" | "eur";
/**
 * Euro prices per month, excluding VAT (Tijs, 26 Oct 2026). The same credits as the dollar plan;
 * annual = exactly ten months (€190 a year, not twelve rounded months like the dollar price).
 * Stripe holds them as `currency_options.eur` on the same prices (scripts/stripe-setup.ts).
 */
export const EUR_MONTHLY: Partial<Record<PlanKey, number>> = {
  starter: 19, starter_2: 32, starter_3: 45,
  pro: 59, pro_2: 87, pro_3: 115,
  scale: 159, scale_2: 236, scale_3: 312,
  business_249: 249, business_499: 499, business_999: 999,
};
/** Dollar prices per month for the higher levels (the same numbers as the euro prices, like the base plans). */
const LEVEL_USD: Partial<Record<PlanKey, number>> = { starter_2: 32, starter_3: 45, pro_2: 87, pro_3: 115, scale_2: 236, scale_3: 312 };

export type PlanKey =
  | "free" | "enterprise"
  | "starter" | "starter_2" | "starter_3"
  | "pro" | "pro_2" | "pro_3"
  | "scale" | "scale_2" | "scale_3"
  | "business_249" | "business_499" | "business_999";

/** The plan a key belongs to, whatever its level: what a workspace may do depends on the family. */
export type PlanFamily = "free" | "starter" | "pro" | "scale" | "business" | "enterprise";

export type Plan = {
  key: PlanKey;
  name: string;
  tagline: string;
  monthlyUsd: number;
  /** Per month when billed annually (ten months charged). */
  annualMonthlyUsd: number;
  /** Euro price per month, excluding VAT (0 when not sold). */
  monthlyEur: number;
  /** Euro price per year: ten months. */
  annualEur: number;
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
  /** Which plan this is, and which of its credit levels (1 = the base level). */
  family: PlanFamily;
  level: 1 | 2 | 3;
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
    monthlyEur: EUR_MONTHLY[key] ?? 0,
    annualEur: (EUR_MONTHLY[key] ?? 0) * ANNUAL_MONTHS_CHARGED,
    creditsPerMonth: credits,
    creditsNote: credits > 0 ? `${credits.toLocaleString("en-US")} credits per month` : `${FREE_CREDITS} free credits`,
    bullets,
    stripeLookup: monthlyUsd > 0 ? { monthly: `reelay_${key}_monthly`, annual: `reelay_${key}_annual` } : undefined,
    family: (key.startsWith("business") ? "business" : key.replace(/_\d$/, "")) as PlanFamily,
    level: Number(key.match(/^(?:starter|pro|scale)_(\d)$/)?.[1] ?? 1) as 1 | 2 | 3,
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
  plan("starter", "Starter", "For a shop translating its first videos", 19, minutesBullets("starter", "Every language, Speed translation")),
  plan("pro", "Pro", "For a brand selling in several languages", 59, minutesBullets("pro", "Precision, the Premium presenter, variations and the API"), { recommended: true }),
  plan("scale", "Scale", "For agencies and several brands", 159, minutesBullets("scale", "Everything in Pro, plus picture enhancement")),
  plan("enterprise", "Enterprise", "Custom volume and terms", 0, ["Custom credits and billing", "Onboarding and a direct line", "Book a demo to talk"], { creditsNote: "Custom", stripeLookup: undefined }),
];

/**
 * Business: one plan with three credit levels for a team workspace (shared credits, members, no cost
 * per seat). Credits follow PLAN_MINUTES like every subscription.
 */
export const BUSINESS_TIERS: Plan[] = [249, 499, 999].map((usd, i) =>
  plan(`business_${usd}` as PlanKey, "Business", "For teams sharing one credit pool", usd, ["Shared credits for the whole team", "Members with their own sign-in, no cost per seat", "Per-member usage for the owner", "API keys for the workspace", "Credits never expire"], { team: true, level: (i + 1) as 1 | 2 | 3 }),
);

/** Levels 2 and 3 of Starter, Pro and Scale: the same plan with more credits a month. */
export const PLAN_LEVELS: Plan[] = (["starter", "pro", "scale"] as const).flatMap((family) =>
  ([2, 3] as const).map((level) => {
    const base = PLANS.find((p) => p.key === family)!;
    const key = `${family}_${level}` as PlanKey;
    return plan(key, base.name, base.tagline, LEVEL_USD[key]!, minutesBullets(key, base.bullets[2]));
  }),
);
export const ALL_PLANS: Plan[] = [...PLANS, ...PLAN_LEVELS, ...BUSINESS_TIERS];

/**
 * "Pro", "Pro · 1,980 credits", "Business · 5,760 credits": a level beyond the first (and every
 * Business level) names its monthly credits (26 Oct 2026: credits only, never minutes, on screen and
 * as the Stripe product name).
 */
export function planLabel(p: Plan) {
  return p.level > 1 || p.family === "business" ? `${p.name} · ${p.creditsPerMonth.toLocaleString("en-US")} credits` : p.name;
}

/** All levels of one plan, lowest first (a single entry for Free and Enterprise). */
export function planLevels(family: PlanFamily): Plan[] {
  return ALL_PLANS.filter((p) => p.family === family).sort((a, b) => a.level - b.level);
}

export function planFamily(key: string | null | undefined): PlanFamily {
  return ALL_PLANS.find((p) => p.key === key)?.family ?? "free";
}

/**
 * Free trial (26 Oct 2026, Tijs): 7 days on every paid plan, card required, once per workspace.
 * During the trial the workspace gets TRIAL.credits; the plan's monthly credits come with the first
 * real payment. Nothing is charged before the trial ends; the customer can cancel any time before.
 */
export const TRIAL = { days: 7, credits: 30 } as const;

/**
 * What each plan unlocks (26 Oct 2026, Tijs approved). The family decides, the level only adds credits.
 * Enforced on the server (data layer, API) and shown with a lock in the forms and on the pricing page.
 */
export type PlanFeature = "precision" | "premium" | "variations" | "api" | "enhance" | "team" | "removeText";
const FEATURES: Record<PlanFamily, PlanFeature[]> = {
  free: [],
  starter: [],
  pro: ["precision", "premium", "variations", "api", "removeText"],
  scale: ["precision", "premium", "variations", "api", "removeText", "enhance"],
  business: ["precision", "premium", "variations", "api", "removeText", "enhance", "team"],
  enterprise: ["precision", "premium", "variations", "api", "removeText", "enhance", "team"],
};
/** The cheapest plan that unlocks a feature, for "Available in Pro" labels. */
export const FEATURE_PLAN: Record<PlanFeature, "Pro" | "Scale" | "Business"> = { precision: "Pro", premium: "Pro", variations: "Pro", api: "Pro", removeText: "Pro", enhance: "Scale", team: "Business" };

export function hasFeature(planKey: string | null | undefined, feature: PlanFeature) {
  return FEATURES[planFamily(planKey)].includes(feature);
}

/** API requests per minute: the base limit, doubled on Scale, Business and Enterprise. */
export function apiRateMultiplier(planKey: string | null | undefined) {
  return ["scale", "business", "enterprise"].includes(planFamily(planKey)) ? 2 : 1;
}

export const isTeamPlan = (key: string | null | undefined) => planFamily(key) === "business";
export const isPaidPlan = (key: string | null | undefined) => ALL_PLANS.some((p) => p.key === key && p.monthlyUsd > 0);

/** The crossed-out launch price, only while its end date has not passed. */
export function activeListPrice(p: Plan, now = new Date()) {
  if (!p.listPrice) return null;
  return new Date(p.listPrice.endDate).getTime() > now.getTime() ? p.listPrice.monthlyUsd : null;
}

/** The real yearly saving of a plan: twelve monthly prices minus the annual total. */
export function annualSaving(p: Plan, currency: Currency = "usd") {
  const x = planPrice(p, currency);
  return Math.round((x.monthly * 12 - x.annualTotal) * 100) / 100;
}

/** The plan a Stripe price belongs to, by its lookup key (monthly or annual); undefined for packs and unknown keys. */
export function planByLookupKey(lookupKey: string | null | undefined): Plan | undefined {
  if (!lookupKey) return undefined;
  return ALL_PLANS.find((p) => p.stripeLookup?.monthly === lookupKey || p.stripeLookup?.annual === lookupKey);
}

export function planByKey(key: string | null | undefined): Plan | undefined {
  return ALL_PLANS.find((p) => p.key === key);
}

export type TopupPack = { key: string; usd: number; eur: number; credits: number; stripeLookup: string };

/** One-off packs at the top-up margin; the credits never expire. Euro packs: €10, €25, €50 (excl. VAT), the same credits. */
export const TOPUPS: TopupPack[] = [10, 25, 50].map((usd) => ({ key: `topup_${usd}`, usd, eur: usd, credits: Math.round(usd / TOPUP_USD_PER_CREDIT), stripeLookup: `reelay_topup_${usd}` }));

/**
 * Any number of credits (26 Oct 2026, Tijs: "zo flexibel mogelijk"): one Stripe price per credit at
 * the pack rate, bought with a quantity, so every amount from `min` to `max` in steps of `step`
 * costs exactly credits × TOPUP_USD_PER_CREDIT (the same in euros). Same margin as the packs.
 */
export const CUSTOM_CREDITS = { min: 100, max: 10_000, step: 50, stripeLookup: "reelay_credit_unit", unitCents: Math.round(TOPUP_USD_PER_CREDIT * 100) } as const;
export const validCustomCredits = (credits: number) => Number.isInteger(credits) && credits >= CUSTOM_CREDITS.min && credits <= CUSTOM_CREDITS.max && credits % CUSTOM_CREDITS.step === 0;
/** The price of `credits` one-off credits, in dollars or euros (the same number). */
export const customCreditsPrice = (credits: number) => Math.round(credits * CUSTOM_CREDITS.unitCents) / 100;

/** Dollars on the English site, euros on the Dutch one. */
export function currencyFor(locale: string | null | undefined): Currency {
  return locale === "nl" ? "eur" : "usd";
}

/** A plan's prices in one currency: per month, per month when billed annually, and the annual total. */
export function planPrice(p: Plan, currency: Currency) {
  if (currency === "eur") return { monthly: p.monthlyEur, annualMonthly: Math.round((p.annualEur / 12) * 100) / 100, annualTotal: p.annualEur };
  return { monthly: p.monthlyUsd, annualMonthly: p.annualMonthlyUsd, annualTotal: p.annualMonthlyUsd * 12 };
}

/** What Stripe charges, in cents per currency (monthly price, annual price, packs). */
export function stripeAmounts(p: Plan) {
  return { monthly: { usd: Math.round(p.monthlyUsd * 100), eur: Math.round(p.monthlyEur * 100) }, annual: { usd: Math.round(p.annualMonthlyUsd * 12 * 100), eur: Math.round(p.annualEur * 100) } };
}
export const packPrice = (t: TopupPack, currency: Currency) => (currency === "eur" ? t.eur : t.usd);

/** "$19", "$1,590", "€15,83" (Dutch) or "€15.83" (English): whole amounts without cents. */
export function formatMoney(amount: number, currency: Currency, locale: string = "en") {
  const tag = locale === "nl" ? "nl-NL" : "en-US";
  const n = amount.toLocaleString(tag, Number.isInteger(amount) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency === "eur" ? "€" : "$"}${n}`;
}

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

/** Price of one minute of Speed translation on a plan (USD by default). */
export function usdPerTranslateMinute(p: Plan, currency: Currency = "usd") {
  return p.creditsPerMonth > 0 ? Math.round((planPrice(p, currency).monthly / (p.creditsPerMonth / 60)) * 100) / 100 : 0;
}
