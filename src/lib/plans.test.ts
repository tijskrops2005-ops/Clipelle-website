import { describe, expect, it } from "vitest";
import { CREDIT_COST_USD, FREE_AD_CREDITS, PLANS, SUBSCRIPTION_MARGIN, TOPUPS, TOPUP_MARGIN, adCredits, planMargin, translateCredits } from "./plans";

describe("plans", () => {
  it("prices every plan at least at the target margin", () => {
    for (const p of PLANS) {
      const m = planMargin(p);
      if (!m) continue;
      expect(p.monthlyUsd / (p.creditsPerMonth * CREDIT_COST_USD)).toBeGreaterThanOrEqual(SUBSCRIPTION_MARGIN);
    }
    for (const t of TOPUPS) expect(t.usd / (t.credits * CREDIT_COST_USD)).toBeGreaterThanOrEqual(TOPUP_MARGIN);
  });
  it("keeps the credit unit tied to the 30 s Standard ad", () => {
    expect(adCredits({ seconds: 30, engine: "avatar_iii" })).toBe(30);
    expect(FREE_AD_CREDITS).toBeLessThan(30);
    expect(translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true })).toBeGreaterThan(0);
  });
});
