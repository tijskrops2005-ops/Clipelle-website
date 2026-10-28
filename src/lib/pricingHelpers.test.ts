import { describe, expect, it } from "vitest";
import { AD_LENGTHS, type AdLength } from "./pricing";
import { ALL_PLANS, BUSINESS_TIERS, CREDIT_COST_USD, MIN_MARGIN, PLANS, TOPUPS, adCredits, annualSaving, translateCredits } from "./plans";
import { ALL_SUBSCRIPTIONS, annualTotals, cheapestPacks, compareMonth, creditsNeeded, featureSteps, HANDS_ON_MINUTES, planExamples, planFit } from "./pricingHelpers";

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

  it("picks the cheapest plan or level that covers the month, without monthly packs", () => {
    for (const credits of [50, 420, 421, 600, 1030, 1500, 1840, 3110, 3726, 6000, 12000, 23160]) {
      const fit = planFit(credits, 5);
      expect(fit.plan).not.toBeNull();
      expect(fit.plan!.creditsPerMonth).toBeGreaterThanOrEqual(credits);
      expect(fit.packs).toBe(0);
      expect(fit.monthlyUsd).toBe(fit.plan!.monthlyUsd);
      // No covering subscription is cheaper.
      for (const p of ALL_SUBSCRIPTIONS) if (p.creditsPerMonth >= credits) expect(p.monthlyUsd).toBeGreaterThanOrEqual(fit.monthlyUsd);
    }
    // Ten 30-second ads (600 credits): the second Starter level, $32, not Starter plus a one-off pack.
    expect(planFit(600, 10).plan?.key).toBe("starter_2");
  });

  it("only suggests plans that have the features the choices need", () => {
    // Ten Premium ads of 10 s (600 credits) need Pro, even though Starter's levels have the credits.
    expect(planFit(600, 10, ALL_SUBSCRIPTIONS, "usd", ["premium"]).plan?.key).toBe("pro");
    expect(planFit(600, 10, ALL_SUBSCRIPTIONS, "usd", ["enhance"]).plan?.key).toBe("scale");
  });

  it("shows packs only beyond the biggest plan", () => {
    const fit = planFit(30_000, 50);
    expect(fit.plan?.key).toBe("business_999");
    expect(fit.withPacks).toBe(true);
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

describe("plan cards: what each plan adds and what the next one unlocks (26 Oct 2026)", () => {
  it("follows the feature table in plans.ts", () => {
    // Variations belong to ads and leave the cards while ads are off (the tests run without NEXT_PUBLIC_ADS_ENABLED).
    expect(featureSteps("starter")).toEqual({ previous: null, added: [], locked: ["precision", "premium", "api", "removeText", "aiPresenter"], next: "Pro" });
    expect(featureSteps("pro")).toEqual({ previous: "Starter", added: ["precision", "premium", "api", "removeText", "aiPresenter"], locked: ["enhance"], next: "Scale" });
    expect(featureSteps("scale")).toEqual({ previous: "Pro", added: ["enhance"], locked: ["team"], next: "Business" });
    expect(featureSteps("business")).toMatchObject({ previous: "Scale", added: ["team"], locked: [], next: null });
  });
});
