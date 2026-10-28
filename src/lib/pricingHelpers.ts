import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { ALL_PLANS, BUSINESS_TIERS, PLANS, PLAN_LEVELS, TOPUPS, adCredits, annualSaving, hasFeature, packPrice, planPrice, translateCredits, type Currency, type Plan, type PlanFamily, type PlanFeature } from "@/lib/plans";

/**
 * Pure helpers for the pricing page and the calculators. Every number comes from plans.ts and
 * pricing.ts; nothing is estimated here. Browser-safe. Amounts are in the `currency` passed (dollars
 * by default, euros on /nl); the `…Usd` field names predate the euro prices.
 */
export type PlanFit = {
  credits: number;
  plan: Plan | null;
  /** Number of credit packs bought on top of the plan (0 = the plan alone covers the month). */
  packs: number;
  packUsd: number;
  monthlyUsd: number;
  perVideoUsd: number;
  /** True when packs are part of the cheapest way to cover the month. */
  withPacks: boolean;
};

export const INDIVIDUAL_PAID = PLANS.filter((p) => p.monthlyUsd > 0 && p.creditsPerMonth > 0);
/** Every subscription a customer can buy: the three individual plans and the Business levels. */
/** Every plan and level a calculator may suggest (levels since 26 Oct 2026). */
export const ALL_SUBSCRIPTIONS = [...INDIVIDUAL_PAID, ...PLAN_LEVELS, ...BUSINESS_TIERS];

/** The cheapest mix of credit packs that adds at least `credits` (every pack size is tried). */
export function cheapestPacks(credits: number, currency: Currency = "usd"): { count: number; usd: number; credits: number } {
  if (credits <= 0) return { count: 0, usd: 0, credits: 0 };
  const sizes = [...TOPUPS].sort((a, b) => b.credits - a.credits);
  let best = { count: Infinity, usd: Infinity, credits: 0 };
  const walk = (i: number, got: number, count: number, usd: number) => {
    if (usd > best.usd) return;
    if (got >= credits) {
      if (usd < best.usd || (usd === best.usd && count < best.count)) best = { count, usd, credits: got };
      return;
    }
    if (i === sizes.length) return;
    const left = credits - got;
    // The last size fills the rest; bigger sizes try every count from "enough on their own" down to none.
    const counts = i === sizes.length - 1 ? [Math.ceil(left / sizes[i].credits)] : Array.from({ length: Math.ceil(left / sizes[i].credits) + 1 }, (_, k) => Math.ceil(left / sizes[i].credits) - k);
    for (const n of counts) walk(i + 1, got + n * sizes[i].credits, count + n, usd + n * packPrice(sizes[i], currency));
  };
  walk(0, 0, 0, 0);
  return best;
}

/**
 * The plan for a month of use (26 Oct 2026, realistic): the cheapest plan or level whose monthly
 * credits cover the month and that has every feature the choices need (Premium and Precision need
 * Pro, enhancement Scale). Packs are one-off, so they are no longer added to a monthly price; only
 * beyond the biggest plan the rest is shown as packs (Enterprise is the better talk then).
 */
export function planFit(creditsPerMonth: number, videos: number, candidates: Plan[] = ALL_SUBSCRIPTIONS, currency: Currency = "usd", needs: PlanFeature[] = []): PlanFit {
  const allowed = candidates.filter((p) => p.creditsPerMonth > 0 && needs.every((f) => hasFeature(p.key, f)));
  const price = (p: Plan) => planPrice(p, currency).monthly;
  const covering = allowed.filter((p) => p.creditsPerMonth >= creditsPerMonth).sort((a, b) => price(a) - price(b));
  const fit = (plan: Plan, packs: { count: number; usd: number }): PlanFit => {
    const monthlyUsd = price(plan) + packs.usd;
    return { credits: creditsPerMonth, plan, packs: packs.count, packUsd: packs.usd, monthlyUsd, perVideoUsd: videos ? monthlyUsd / videos : 0, withPacks: packs.count > 0 };
  };
  if (covering[0]) return fit(covering[0], { count: 0, usd: 0 });
  const biggest = [...allowed].sort((a, b) => b.creditsPerMonth - a.creditsPerMonth)[0];
  if (!biggest) return { credits: creditsPerMonth, plan: null, packs: 0, packUsd: 0, monthlyUsd: 0, perVideoUsd: 0, withPacks: false };
  return fit(biggest, cheapestPacks(creditsPerMonth - biggest.creditsPerMonth, currency));
}

/** Hands-on time per video with Clipelle: filling in the form and checking the result (stated on the page). */
export const HANDS_ON_MINUTES = 5;

/**
 * "Clipelle vs doing it yourself" for one month, from the visitor's own numbers (25 Oct 2026):
 * money (what a video costs them now vs the cheapest plan-plus-packs from planFit) and time
 * (their minutes per video vs HANDS_ON_MINUTES, valued at their hourly rate). `savingUsd` is
 * negative when Clipelle costs more at these numbers; the page then says so.
 */
export function compareMonth(input: { costNow: number; videos: number; seconds: AdLength; engine: PresenterEngine; translateMinutes: number; minutesNow: number; hourValue: number; currency?: Currency }) {
  const { perAd, total: credits } = creditsNeeded({ ads: input.videos, seconds: input.seconds, engine: input.engine, translateMinutes: input.translateMinutes });
  const fit = planFit(credits, input.videos, ALL_SUBSCRIPTIONS, input.currency, input.engine === "avatar_iv" ? ["premium"] : []);
  const yourMoney = input.costNow * input.videos;
  const yourHours = (input.videos * input.minutesNow) / 60;
  const ourHours = (input.videos * HANDS_ON_MINUTES) / 60;
  const yourTotal = yourMoney + yourHours * input.hourValue;
  const ourTotal = fit.monthlyUsd + ourHours * input.hourValue;
  return { perAd, credits, fit, yourMoney, yourHours, ourHours, yourTotal, ourTotal, savingUsd: yourTotal - ourTotal, hoursBack: yourHours - ourHours };
}

/** The same comparison for any video with a known credit price (26 Oct 2026: translations in the calculator). */
export function compareCredits(input: { costNow: number; videos: number; creditsPerVideo: number; minutesNow: number; hourValue: number; currency?: Currency; needs?: PlanFeature[] }) {
  const credits = input.creditsPerVideo * input.videos;
  const fit = planFit(credits, input.videos, ALL_SUBSCRIPTIONS, input.currency, input.needs);
  const yourMoney = input.costNow * input.videos;
  const yourHours = (input.videos * input.minutesNow) / 60;
  const ourHours = (input.videos * HANDS_ON_MINUTES) / 60;
  const yourTotal = yourMoney + yourHours * input.hourValue;
  const ourTotal = fit.monthlyUsd + ourHours * input.hourValue;
  return { perAd: input.creditsPerVideo, credits, fit, yourMoney, yourHours, ourHours, yourTotal, ourTotal, savingUsd: yourTotal - ourTotal, hoursBack: yourHours - ourHours };
}

/** Credits a month of use needs: ads at one length and quality plus translation minutes (Speed, one language). */
export function creditsNeeded(input: { ads: number; seconds: AdLength; engine: PresenterEngine; translateMinutes: number }) {
  const perAd = adCredits({ seconds: input.seconds, engine: input.engine });
  const perMinute = translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true });
  return { perAd, perMinute, total: input.ads * perAd + input.translateMinutes * perMinute };
}

/** What a plan's monthly credits buy, in the units people think in. */
export function planExamples(p: Plan) {
  const ad30 = adCredits({ seconds: 30, engine: "avatar_iii" });
  const ad10 = adCredits({ seconds: 10, engine: "avatar_iii" });
  const premium30 = adCredits({ seconds: 30, engine: "avatar_iv" });
  const minute = translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true });
  return {
    ads30: Math.floor(p.creditsPerMonth / ad30),
    ads10: Math.floor(p.creditsPerMonth / ad10),
    premium30: Math.floor(p.creditsPerMonth / premium30),
    translateMinutes: Math.floor(p.creditsPerMonth / minute),
  };
}

/** What one credit costs on a plan (price ÷ monthly credits); used for "≈ $ on Pro" next to credit prices. */
export function usdPerCredit(p: Plan, currency: Currency = "usd") {
  return p.creditsPerMonth > 0 ? planPrice(p, currency).monthly / p.creditsPerMonth : 0;
}

/** Annual billing: how much a year costs and what is saved against twelve monthly payments. */
export function annualTotals(p: Plan, currency: Currency = "usd") {
  const x = planPrice(p, currency);
  return { yearUsd: Math.round(x.annualTotal * 100) / 100, savingUsd: annualSaving(p, currency), savingPct: x.monthly > 0 ? Math.round((annualSaving(p, currency) / (x.monthly * 12)) * 100) : 0 };
}

export const AD_LENGTH_OPTIONS = AD_LENGTHS;
export const BUSINESS = BUSINESS_TIERS;
export const EVERY_PLAN = ALL_PLANS;

/** The plan families in upgrade order, with one key each to read their features from. */
const FAMILY_ORDER: { family: PlanFamily; key: string; name: string }[] = [
  { family: "free", key: "free", name: "Free" },
  { family: "starter", key: "starter", name: "Starter" },
  { family: "pro", key: "pro", name: "Pro" },
  { family: "scale", key: "scale", name: "Scale" },
  { family: "business", key: "business_249", name: "Business" },
];
const FEATURE_ORDER: PlanFeature[] = ["precision", "premium", "variations", "api", "removeText", "aiPresenter", "enhance", "team"];
/** Variations belong to ads: they leave the plan cards while ads are off (27 Oct 2026). */
const ADS_ON = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
const featuresOf = (key: string) => FEATURE_ORDER.filter((f) => hasFeature(key, f) && (ADS_ON || f !== "variations"));

/**
 * For a plan card (26 Oct 2026): the plan below it ("Everything in Starter, plus"), the features this
 * plan adds on top of that one, and the features of the next plan, shown with a lock ("Available in
 * Pro"). Read from the feature table in plans.ts, so the cards always match what the server allows.
 */
export function featureSteps(family: PlanFamily) {
  const i = FAMILY_ORDER.findIndex((f) => f.family === family);
  if (i < 0) return { previous: null, added: [] as PlanFeature[], locked: [] as PlanFeature[], next: null };
  const own = featuresOf(FAMILY_ORDER[i].key);
  const prev = i > 0 ? FAMILY_ORDER[i - 1] : null;
  const next = i < FAMILY_ORDER.length - 1 ? FAMILY_ORDER[i + 1] : null;
  const prevFeatures = prev ? featuresOf(prev.key) : [];
  return {
    previous: prev && prev.family !== "free" ? prev.name : null,
    added: own.filter((f) => !prevFeatures.includes(f)),
    locked: next ? featuresOf(next.key).filter((f) => !own.includes(f)) : [],
    next: next?.name ?? null,
  };
}
