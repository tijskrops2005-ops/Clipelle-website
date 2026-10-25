import { describe, expect, it } from "vitest";
import { AD_LENGTHS, type AdLength } from "./pricing";
import { ALL_PLANS, BUSINESS_TIERS, CREDIT_COST_USD, MIN_SUBSCRIPTION_MARGIN, PLANS, TOPUPS, adCredits, annualSaving, translateCredits } from "./plans";
import { annualTotals, creditsNeeded, INDIVIDUAL_PAID, planExamples, planFit } from "./pricingHelpers";

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

  it("picks the cheapest plan that covers the need, and Scale plus packs above it", () => {
    for (let credits = 0; credits <= 6000; credits += 37) {
      const fit = planFit(credits, 5);
      const covering = INDIVIDUAL_PAID.filter((p) => p.creditsPerMonth >= credits);
      if (covering.length) {
        expect(fit.plan?.key).toBe(covering[0].key);
        expect(fit.monthlyUsd).toBe(covering[0].monthlyUsd);
        expect(fit.overScale).toBe(false);
      } else {
        const top = INDIVIDUAL_PAID[INDIVIDUAL_PAID.length - 1];
        const biggest = TOPUPS[TOPUPS.length - 1];
        expect(fit.overScale).toBe(true);
        expect(top.creditsPerMonth + fit.packs * biggest.credits).toBeGreaterThanOrEqual(credits);
        expect(fit.monthlyUsd).toBe(top.monthlyUsd + fit.packs * biggest.usd);
      }
    }
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
      expect(t.creditsPerMonth * CREDIT_COST_USD * MIN_SUBSCRIPTION_MARGIN).toBeLessThanOrEqual(t.monthlyUsd);
    }
  });
});
