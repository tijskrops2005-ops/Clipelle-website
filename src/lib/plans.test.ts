import { describe, expect, it } from "vitest";
import { ALL_PLANS, BUSINESS_TIERS, CREDIT_COST_USD, FREE_CREDITS, MIN_MARGIN, PLANS, TOPUPS, adCredits, planByLookupKey, translateCredits, usdPerTranslateMinute } from "./plans";
import { AD_LENGTHS, DEFAULTS, estimateAdCost, estimateTranslateCost } from "./pricing";

const paid = ALL_PLANS.filter((p) => p.monthlyUsd > 0 && p.creditsPerMonth > 0);
const usdPerCredit = (p: (typeof paid)[number]) => p.monthlyUsd / p.creditsPerMonth;

/** Provider cost per credit of every product a credit can buy (the same estimates the forms show). */
function costsPerCredit() {
  const out: { name: string; usd: number }[] = [];
  for (const quality of ["speed", "precision"] as const) {
    for (const enhance of [false, true]) {
      for (const seconds of [3, 8, 15, 30, 60, 180]) {
        const usd = estimateTranslateCost({ seconds, quality, enhance, languages: 1, hasSourceTranscript: true }).perLanguageTotal;
        out.push({ name: `translate ${quality}${enhance ? "+enhance" : ""} ${seconds}s`, usd: usd / translateCredits({ seconds, quality, enhance }) });
      }
    }
  }
  for (const seconds of AD_LENGTHS) {
    for (const engine of ["avatar_iii", "avatar_iv"] as const) out.push({ name: `ad ${engine} ${seconds}s`, usd: estimateAdCost({ seconds, clipModel: DEFAULTS.clipModel, engine }).total / adCredits({ seconds, engine }) });
  }
  return out;
}

describe("credits: one second of finished video", () => {
  it("prices translations per second and quality", () => {
    expect(translateCredits({ seconds: 60, quality: "speed", enhance: false })).toBe(60);
    expect(translateCredits({ seconds: 60, quality: "precision", enhance: false })).toBe(120);
    expect(translateCredits({ seconds: 60, quality: "speed", enhance: true })).toBe(120);
    expect(translateCredits({ seconds: 12.4, quality: "speed", enhance: false })).toBe(13);
    // Short clips have a minimum: the quality check has a fixed part per video.
    expect(translateCredits({ seconds: 8, quality: "speed", enhance: false })).toBe(10);
  });

  it("prices ads per second with a minimum, Premium higher", () => {
    expect(adCredits({ seconds: 10, engine: "avatar_iii" })).toBe(30);
    expect(adCredits({ seconds: 30, engine: "avatar_iii" })).toBe(60);
    expect(adCredits({ seconds: 60, engine: "avatar_iii" })).toBe(120);
    expect(adCredits({ seconds: 10, engine: "avatar_iv" })).toBe(60);
    expect(adCredits({ seconds: 30, engine: "avatar_iv" })).toBe(180);
    // A slower voice makes the video longer, so it costs more.
    expect(adCredits({ seconds: 30, engine: "avatar_iii", speed: 0.9 })).toBe(68);
  });

  it("makes a 30-second Standard ad cost the same as one minute of translation", () => {
    expect(adCredits({ seconds: 30, engine: "avatar_iii" })).toBe(translateCredits({ seconds: 60, quality: "speed", enhance: false }));
  });

  it("lets the free credits cover half a minute of translation or one 10-second ad", () => {
    expect(translateCredits({ seconds: 30, quality: "speed", enhance: false })).toBe(FREE_CREDITS);
    expect(adCredits({ seconds: 10, engine: "avatar_iii" })).toBe(FREE_CREDITS);
  });
});

describe("plans", () => {
  it("keeps every product at or above the minimum margin on every plan and pack", () => {
    const worst = Math.max(...costsPerCredit().map((c) => c.usd));
    expect(CREDIT_COST_USD).toBeCloseTo(worst, 3);
    for (const p of paid) expect(usdPerCredit(p) / worst).toBeGreaterThanOrEqual(MIN_MARGIN);
    for (const t of TOPUPS) expect(t.usd / t.credits / worst).toBeGreaterThanOrEqual(MIN_MARGIN);
  });

  it("makes a bigger plan never more expensive per minute (individual plans, then business tiers)", () => {
    for (const list of [PLANS.filter((p) => p.monthlyUsd > 0 && p.creditsPerMonth > 0), BUSINESS_TIERS]) {
      for (let i = 1; i < list.length; i++) expect(usdPerTranslateMinute(list[i])).toBeLessThanOrEqual(usdPerTranslateMinute(list[i - 1]));
    }
    expect(usdPerTranslateMinute(BUSINESS_TIERS[0])).toBeLessThanOrEqual(usdPerTranslateMinute(PLANS.find((p) => p.key === "scale")!));
  });

  it("sells whole minutes and keeps a minute of translation within the market range ($2–3)", () => {
    for (const p of paid) {
      expect(p.creditsPerMonth % 60).toBe(0);
      expect(usdPerTranslateMinute(p)).toBeGreaterThanOrEqual(2);
      expect(usdPerTranslateMinute(p)).toBeLessThanOrEqual(3);
    }
  });
});


describe("plans by Stripe lookup key", () => {
  it("finds a plan from its monthly or annual price, and nothing for packs", () => {
    expect(planByLookupKey("reelay_pro_monthly")?.key).toBe("pro");
    expect(planByLookupKey("reelay_starter_annual")?.key).toBe("starter");
    expect(planByLookupKey("reelay_business_499_monthly")?.key).toBe("business_499");
    expect(planByLookupKey("reelay_topup_10")).toBeUndefined();
    expect(planByLookupKey(null)).toBeUndefined();
  });
});
