import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { ALL_PLANS, BUSINESS_TIERS, PLANS, TOPUPS, adCredits, annualSaving, translateCredits, type Plan } from "@/lib/plans";

/**
 * Pure helpers for the pricing page and the calculators. Every number comes from plans.ts and
 * pricing.ts; nothing is estimated here. Browser-safe.
 */
export type PlanFit = { credits: number; plan: Plan | null; packs: number; monthlyUsd: number; perVideoUsd: number; overScale: boolean };

export const INDIVIDUAL_PAID = PLANS.filter((p) => p.monthlyUsd > 0 && p.creditsPerMonth > 0);

/** The cheapest individual plan whose monthly credits cover the need; above Scale, Scale plus the biggest packs. */
export function planFit(creditsPerMonth: number, videos: number, candidates: Plan[] = INDIVIDUAL_PAID): PlanFit {
  const fits = candidates.find((p) => p.creditsPerMonth >= creditsPerMonth);
  if (fits) return { credits: creditsPerMonth, plan: fits, packs: 0, monthlyUsd: fits.monthlyUsd, perVideoUsd: videos ? fits.monthlyUsd / videos : 0, overScale: false };
  const top = candidates[candidates.length - 1];
  const biggest = TOPUPS[TOPUPS.length - 1];
  const packs = Math.ceil((creditsPerMonth - top.creditsPerMonth) / biggest.credits);
  const monthlyUsd = top.monthlyUsd + packs * biggest.usd;
  return { credits: creditsPerMonth, plan: top, packs, monthlyUsd, perVideoUsd: videos ? monthlyUsd / videos : 0, overScale: true };
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
