import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { ALL_PLANS, BUSINESS_TIERS, PLANS, TOPUPS, adCredits, annualSaving, translateCredits, type Plan } from "@/lib/plans";

/**
 * Pure helpers for the pricing page and the calculators. Every number comes from plans.ts and
 * pricing.ts; nothing is estimated here. Browser-safe.
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
export const ALL_SUBSCRIPTIONS = [...INDIVIDUAL_PAID, ...BUSINESS_TIERS];

/** The cheapest mix of credit packs that adds at least `credits` (every pack size is tried). */
export function cheapestPacks(credits: number): { count: number; usd: number; credits: number } {
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
    for (const n of counts) walk(i + 1, got + n * sizes[i].credits, count + n, usd + n * sizes[i].usd);
  };
  walk(0, 0, 0, 0);
  return best;
}

/**
 * The cheapest way to cover a month (25 Oct 2026): every subscription on its own or topped up with
 * the cheapest credit packs, whichever costs least. Before, the next bigger plan was always picked,
 * even when a smaller plan plus a pack was cheaper.
 */
export function planFit(creditsPerMonth: number, videos: number, candidates: Plan[] = ALL_SUBSCRIPTIONS): PlanFit {
  let best: PlanFit | null = null;
  for (const plan of candidates) {
    const packs = cheapestPacks(creditsPerMonth - plan.creditsPerMonth);
    const monthlyUsd = plan.monthlyUsd + packs.usd;
    if (!best || monthlyUsd < best.monthlyUsd) {
      best = { credits: creditsPerMonth, plan, packs: packs.count, packUsd: packs.usd, monthlyUsd, perVideoUsd: videos ? monthlyUsd / videos : 0, withPacks: packs.count > 0 };
    }
  }
  return best ?? { credits: creditsPerMonth, plan: null, packs: 0, packUsd: 0, monthlyUsd: 0, perVideoUsd: 0, withPacks: false };
}

/** Hands-on time per video with Clipelle: filling in the form and checking the result (stated on the page). */
export const HANDS_ON_MINUTES = 5;

/**
 * "Clipelle vs doing it yourself" for one month, from the visitor's own numbers (25 Oct 2026):
 * money (what a video costs them now vs the cheapest plan-plus-packs from planFit) and time
 * (their minutes per video vs HANDS_ON_MINUTES, valued at their hourly rate). `savingUsd` is
 * negative when Clipelle costs more at these numbers; the page then says so.
 */
export function compareMonth(input: { costNow: number; videos: number; seconds: AdLength; engine: PresenterEngine; translateMinutes: number; minutesNow: number; hourValue: number }) {
  const { perAd, total: credits } = creditsNeeded({ ads: input.videos, seconds: input.seconds, engine: input.engine, translateMinutes: input.translateMinutes });
  const fit = planFit(credits, input.videos);
  const yourMoney = input.costNow * input.videos;
  const yourHours = (input.videos * input.minutesNow) / 60;
  const ourHours = (input.videos * HANDS_ON_MINUTES) / 60;
  const yourTotal = yourMoney + yourHours * input.hourValue;
  const ourTotal = fit.monthlyUsd + ourHours * input.hourValue;
  return { perAd, credits, fit, yourMoney, yourHours, ourHours, yourTotal, ourTotal, savingUsd: yourTotal - ourTotal, hoursBack: yourHours - ourHours };
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

/** Dollars one credit costs on a plan (price ÷ monthly credits); used for "≈ $ on Pro" next to credit prices. */
export function usdPerCredit(p: Plan) {
  return p.creditsPerMonth > 0 ? p.monthlyUsd / p.creditsPerMonth : 0;
}

/** Annual billing: how much a year costs and what is saved against twelve monthly payments. */
export function annualTotals(p: Plan) {
  return { yearUsd: Math.round(p.annualMonthlyUsd * 12 * 100) / 100, savingUsd: annualSaving(p), savingPct: p.monthlyUsd > 0 ? Math.round((annualSaving(p) / (p.monthlyUsd * 12)) * 100) : 0 };
}

export const AD_LENGTH_OPTIONS = AD_LENGTHS;
export const BUSINESS = BUSINESS_TIERS;
export const EVERY_PLAN = ALL_PLANS;
