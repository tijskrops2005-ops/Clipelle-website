import { describe, expect, it } from "vitest";
import { ALL_PLANS, BUSINESS_TIERS, TRIAL, hasFeature, isTeamPlan, planFamily, planLevels, CREDIT_COST_USD, FREE_CREDITS, MIN_MARGIN, PLANS, TOPUPS, adCredits, currencyFor, formatMoney, planByLookupKey, planPrice, stripeAmounts, translateCredits, usdPerTranslateMinute } from "./plans";
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
  // "Translate with an AI presenter" (26 Oct 2026): priced like an ad of that quality.
  for (const engine of ["avatar_iii", "avatar_iv"] as const) {
    for (const seconds of [5, 10, 30, 60, 180]) {
      for (const removeText of [false, true]) {
        const usd = estimateTranslateCost({ seconds, quality: "speed", enhance: false, removeText, presenterEngine: engine, languages: 1, hasSourceTranscript: true }).perLanguageTotal;
        out.push({ name: `presenter translate ${engine} ${seconds}s${removeText ? "+text" : ""}`, usd: usd / translateCredits({ seconds, quality: "speed", enhance: false, removeText, presenterEngine: engine }) });
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
    // The rounded second the form shows (28 Oct 2026; was every started second).
    expect(translateCredits({ seconds: 12.4, quality: "speed", enhance: false })).toBe(12);
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

describe("euro prices (26 Oct 2026)", () => {
  const eur = (key: string) => ALL_PLANS.find((p) => p.key === key)!;
  it("matches the agreed monthly prices excluding VAT, annual is exactly ten months", () => {
    const expected: Record<string, number> = { starter: 19, pro: 59, scale: 159, business_249: 249, business_499: 499, business_999: 999 };
    for (const [key, monthly] of Object.entries(expected)) {
      expect(eur(key).monthlyEur).toBe(monthly);
      expect(eur(key).annualEur).toBe(monthly * 10);
      expect(stripeAmounts(eur(key))).toMatchObject({ monthly: { eur: monthly * 100 }, annual: { eur: monthly * 1000 } });
    }
    expect(eur("free").monthlyEur).toBe(0);
    expect(planPrice(eur("pro"), "eur")).toEqual({ monthly: 59, annualMonthly: 49.17, annualTotal: 590 });
  });
  it("leaves dollar prices and credits as they were", () => {
    expect(stripeAmounts(eur("starter"))).toEqual({ monthly: { usd: 1900, eur: 1900 }, annual: { usd: 19200, eur: 19000 } });
    expect(planPrice(eur("pro"), "usd")).toEqual({ monthly: 59, annualMonthly: 49, annualTotal: 588 });
    expect(eur("pro").creditsPerMonth).toBe(22 * 60);
  });
  it("sells packs for €10, €25 and €50 with the same credits", () => {
    expect(TOPUPS.map((t) => [t.eur, t.usd, t.credits])).toEqual([[10, 10, 200], [25, 25, 500], [50, 50, 1000]]);
  });
  it("shows dollars on the English site and euros on the Dutch one", () => {
    expect(currencyFor("en")).toBe("usd");
    expect(currencyFor("nl")).toBe("eur");
    expect(formatMoney(19, "eur", "nl")).toBe("€19");
    expect(formatMoney(15.83, "eur", "nl")).toBe("€15,83");
    expect(formatMoney(1590, "eur", "nl")).toBe("€1.590");
    expect(formatMoney(1590, "usd", "en")).toBe("$1,590");
  });
});

describe("plan levels, features and the trial (26 Oct 2026)", () => {
  it("gives every plan three levels: more credits, a little cheaper per minute, below the next plan", () => {
    const families = ["starter", "pro", "scale", "business"] as const;
    for (const f of families) {
      const levels = planLevels(f);
      expect(levels.map((l) => l.level)).toEqual([1, 2, 3]);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].creditsPerMonth).toBeGreaterThan(levels[i - 1].creditsPerMonth);
        expect(levels[i].monthlyUsd).toBeGreaterThan(levels[i - 1].monthlyUsd);
        expect(usdPerTranslateMinute(levels[i])).toBeLessThanOrEqual(usdPerTranslateMinute(levels[i - 1]));
        expect(levels[i].monthlyEur).toBe(levels[i].monthlyUsd);
      }
    }
    // A plan's top level stays below the next plan's first level in credits.
    expect(planLevels("starter")[2].creditsPerMonth).toBeLessThan(planLevels("pro")[0].creditsPerMonth);
    expect(planLevels("pro")[2].creditsPerMonth).toBeLessThan(planLevels("scale")[0].creditsPerMonth);
  });

  it("has the agreed level prices and minutes", () => {
    const table = ALL_PLANS.filter((p) => ["starter", "pro", "scale"].includes(p.family)).map((p) => [p.key, p.monthlyUsd, p.creditsPerMonth / 60]);
    expect(table).toEqual([
      ["starter", 19, 7], ["pro", 59, 22], ["scale", 159, 60],
      ["starter_2", 32, 12], ["starter_3", 45, 17],
      ["pro_2", 87, 33], ["pro_3", 115, 44],
      ["scale_2", 236, 90], ["scale_3", 312, 120],
    ]);
    expect(planByLookupKey("reelay_pro_2_annual")?.key).toBe("pro_2");
    expect(planFamily("scale_3")).toBe("scale");
  });

  it("unlocks features per plan, whatever the level", () => {
    expect(hasFeature("starter_3", "precision")).toBe(false);
    expect(hasFeature("starter_3", "api")).toBe(false);
    expect(hasFeature("pro", "premium")).toBe(true);
    expect(hasFeature("pro_3", "enhance")).toBe(false);
    expect(hasFeature("scale", "enhance")).toBe(true);
    expect(hasFeature("business_249", "team")).toBe(true);
    expect(hasFeature("free", "variations")).toBe(false);
    expect(hasFeature(null, "api")).toBe(false);
    expect(isTeamPlan("business_499")).toBe(true);
    expect(isTeamPlan("pro_2")).toBe(false);
  });

  it("offers a 7-day trial with 30 credits", () => {
    expect(TRIAL).toEqual({ days: 7 });
  });
});

describe("billed seconds match the screen (28 Oct 2026)", () => {
  it("bills the rounded second the form shows", async () => {
    const { translateCredits, billedSeconds } = await import("./plans");
    expect(billedSeconds(31.3)).toBe(31);
    expect(billedSeconds(31.6)).toBe(32);
    expect(translateCredits({ seconds: 31.3, quality: "speed", enhance: false, removeText: true })).toBe(62);
    expect(translateCredits({ seconds: 31.3, quality: "speed", enhance: false })).toBe(31);
  });
});
