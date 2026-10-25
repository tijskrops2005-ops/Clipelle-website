import { describe, expect, it } from "vitest";
import { ALL_PLANS, BUSINESS_TIERS, CREDIT_COST_USD, FREE_AD_CREDITS, MIN_SUBSCRIPTION_MARGIN, MIN_TRANSLATE_MARGIN, PLANS, PLAN_MARGINS, TOPUPS, TOPUP_MARGIN, TRANSLATE_CREDIT_FACTOR, adCredits, creditsForSpend, translateCredits } from "./plans";
import { estimateTranslateCost } from "./pricing";

const paid = ALL_PLANS.filter((p) => p.monthlyUsd > 0 && p.creditsPerMonth > 0);
const margin = (p: (typeof paid)[number]) => p.monthlyUsd / (p.creditsPerMonth * CREDIT_COST_USD);
const usdPerCredit = (p: (typeof paid)[number]) => p.monthlyUsd / p.creditsPerMonth;

describe("plans", () => {
  it("keeps every subscription at or above the minimum margin, and packs at their own margin", () => {
    for (const p of paid) {
      expect(margin(p)).toBeGreaterThanOrEqual(MIN_SUBSCRIPTION_MARGIN);
      expect(margin(p)).toBeGreaterThanOrEqual(PLAN_MARGINS[p.key] ?? MIN_SUBSCRIPTION_MARGIN);
    }
    for (const t of TOPUPS) expect(t.usd / (t.credits * CREDIT_COST_USD)).toBeGreaterThanOrEqual(TOPUP_MARGIN);
  });

  it("makes a bigger plan never more expensive per credit (individual plans, then business tiers)", () => {
    for (const list of [PLANS.filter((p) => p.monthlyUsd > 0 && p.creditsPerMonth > 0), BUSINESS_TIERS]) {
      for (let i = 1; i < list.length; i++) expect(usdPerCredit(list[i])).toBeLessThanOrEqual(usdPerCredit(list[i - 1]));
    }
    const individual = PLANS.filter((p) => p.monthlyUsd > 0 && p.creditsPerMonth > 0);
    expect(usdPerCredit(individual[individual.length - 1])).toBeLessThan(usdPerCredit(individual[0]));
  });

  it("lets Starter cover ten 30-second Standard ads", () => {
    const starter = PLANS.find((p) => p.key === "starter")!;
    expect(Math.floor(starter.creditsPerMonth / adCredits({ seconds: 30, engine: "avatar_iii" }))).toBeGreaterThanOrEqual(10);
  });

  it("keeps translations above their minimum margin on every plan", () => {
    const minute = { seconds: 60, quality: "speed" as const, enhance: false, languages: 1, hasSourceTranscript: true };
    const cost = estimateTranslateCost(minute).perLanguageTotal;
    for (const p of paid) expect((translateCredits(minute) * usdPerCredit(p)) / cost).toBeGreaterThanOrEqual(MIN_TRANSLATE_MARGIN);
  });

  it("settles a finished project with the same rule as its estimate", () => {
    expect(creditsForSpend(1, "ad")).toBe(Math.ceil(1 / CREDIT_COST_USD));
    expect(creditsForSpend(1, "translate")).toBe(Math.ceil(TRANSLATE_CREDIT_FACTOR / CREDIT_COST_USD));
  });

  it("keeps the credit unit tied to the 30 s Standard ad", () => {
    expect(adCredits({ seconds: 30, engine: "avatar_iii" })).toBe(30);
    expect(FREE_AD_CREDITS).toBeLessThan(30);
    expect(translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true })).toBeGreaterThan(0);
  });
});
