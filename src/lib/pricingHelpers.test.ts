import { describe, expect, it } from "vitest";
import { AD_LENGTHS, type AdLength } from "./pricing";
import { ALL_PLANS, BUSINESS_TIERS, CREDIT_COST_USD, MIN_MARGIN, PLANS, TOPUPS, adCredits, annualSaving, translateCredits } from "./plans";
import { ALL_SUBSCRIPTIONS, annualTotals, cheapestPacks, compareMonth, creditsNeeded, HANDS_ON_MINUTES, planExamples, planFit } from "./pricingHelpers";

describe("pricing helpers match plans.ts for every combination", () => {
  it("credits needed = ads × adCredits + minutes × translateCredits", () => {
    for (const seconds of AD_LENGTHS) {
      for (const engine of ["avatar_iii", "avatar_iv"] as const) {
        for (const ads of [0, 1, 7, 30]) {
          for (const minutes of [0, 3, 40]) {
            const r = creditsNeeded({ ads, seconds: seconds as AdLength, engine, translateMinutes: minutes });
            expect(r.total).toBe(ads * adCredits({ seconds, engine }) + minutes * translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }));
          }
        }
      }
    }
  });

  it("picks the cheapest way to cover the month: a plan alone or a plan plus packs", () => {
    for (const credits of [50, 300, 301, 414, 1030, 1500, 1840, 3110, 3726, 6000, 12000]) {
      const fit = planFit(credits, 5);
      expect(fit.plan).not.toBeNull();
      // The month is covered.
      expect(fit.plan!.creditsPerMonth + cheapestPacks(credits - fit.plan!.creditsPerMonth).credits).toBeGreaterThanOrEqual(credits);
      const best = cheapestPacks(credits - fit.plan!.creditsPerMonth);
      expect(fit.packs).toBe(best.count);
      expect(fit.monthlyUsd).toBe(fit.plan!.monthlyUsd + best.usd);
      // No subscription, alone or with packs, is cheaper.
      for (const p of ALL_SUBSCRIPTIONS) expect(p.monthlyUsd + cheapestPacks(credits - p.creditsPerMonth).usd).toBeGreaterThanOrEqual(fit.monthlyUsd);
    }
  });

  it("tops up a smaller plan when that is cheaper than the next plan", () => {
    // 414 credits: Starter (300) + two $10 packs = $39, cheaper than Pro at $59.
    const fit = planFit(414, 9);
    expect(fit.plan?.key).toBe("starter");
    expect(fit.monthlyUsd).toBeLessThan(59);
  });

  it("cheapest packs cover the shortfall", () => {
    for (const need of [1, 110, 111, 500, 551, 2000]) {
      const p = cheapestPacks(need);
      expect(p.credits).toBeGreaterThanOrEqual(need);
      // Never dearer than buying only the smallest pack.
      const smallest = [...TOPUPS].sort((a, b) => a.usd - b.usd)[0];
      expect(p.usd).toBeLessThanOrEqual(Math.ceil(need / smallest.credits) * smallest.usd);
    }
    expect(cheapestPacks(0)).toEqual({ count: 0, usd: 0, credits: 0 });
  });

  it("annual saving is twelve monthly prices minus the annual total", () => {
    for (const p of ALL_PLANS.filter((p) => p.monthlyUsd > 0)) {
      const t = annualTotals(p);
      expect(t.savingUsd).toBeCloseTo(p.monthlyUsd * 12 - p.annualMonthlyUsd * 12, 2);
      expect(t.savingUsd).toBe(annualSaving(p));
      expect(t.savingPct).toBe(Math.round((annualSaving(p) / (p.monthlyUsd * 12)) * 100));
    }
  });

  it("plan examples follow from the credits and never exceed them", () => {
    for (const p of [...PLANS, ...BUSINESS_TIERS].filter((p) => p.creditsPerMonth > 0)) {
      const e = planExamples(p);
      expect(e.ads30 * adCredits({ seconds: 30, engine: "avatar_iii" })).toBeLessThanOrEqual(p.creditsPerMonth);
      expect((e.ads30 + 1) * adCredits({ seconds: 30, engine: "avatar_iii" })).toBeGreaterThan(p.creditsPerMonth);
    }
  });

  it("business tiers keep at least the minimum subscription margin", () => {
    for (const t of BUSINESS_TIERS) {
      expect(t.team).toBe(true);
      expect(t.creditsPerMonth * CREDIT_COST_USD * MIN_MARGIN).toBeLessThanOrEqual(t.monthlyUsd);
    }
  });

  it("compares a month in money and time, and admits when Clipelle costs more", () => {
    const base = { costNow: 2.5, videos: 9, seconds: 60 as AdLength, engine: "avatar_iii" as const, translateMinutes: 0, hourValue: 25 };
    // An hour of your own work per video: Clipelle saves money and time.
    const withTime = compareMonth({ ...base, minutesNow: 60 });
    expect(withTime.fit.monthlyUsd).toBe(planFit(withTime.credits, 9).monthlyUsd);
    expect(withTime.yourTotal).toBeCloseTo(9 * 2.5 + 9 * 25, 6);
    expect(withTime.ourTotal).toBeCloseTo(withTime.fit.monthlyUsd + (9 * HANDS_ON_MINUTES / 60) * 25, 6);
    expect(withTime.savingUsd).toBeGreaterThan(0);
    // No own time at all and $2.50 per 60-second video: Clipelle costs more, and the number says so.
    const moneyOnly = compareMonth({ ...base, minutesNow: 0 });
    expect(moneyOnly.savingUsd).toBeLessThan(0);
    expect(moneyOnly.hoursBack).toBeLessThan(0);
  });
});
