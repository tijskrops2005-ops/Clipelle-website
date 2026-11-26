import { describe, expect, it } from "vitest";
import { PLANS, TOPUPS } from "./plans";
import { creditUnitDescription, packDescription, planDescription } from "./billingProducts";

describe("product descriptions on the checkout page", () => {
  it("say what a plan and a pack buy, in credits, and that credits never expire", () => {
    const pro = PLANS.find((p) => p.key === "pro")!;
    expect(planDescription(pro)).toMatch(/^55 minutes of translated video a month \(3,300 credits\)/);
    expect(packDescription(TOPUPS[0])).toContain(`${TOPUPS[0].credits} credits`);
    for (const d of [planDescription(pro), packDescription(TOPUPS[0])]) {
      expect(d).toContain("Credits never expire");
      expect(d.length).toBeLessThan(300);
      expect(d).not.toMatch(/\$/);
    }
  });

  it("name the ad rate only while ads are on", () => {
    const pro = PLANS.find((p) => p.key === "pro")!;
    expect(planDescription(pro, false)).not.toMatch(/\bad\b/);
    expect(creditUnitDescription(false)).not.toMatch(/\bad\b/);
    expect(planDescription(pro, true)).toMatch(/an ad uses \d+ per second/);
  });
});
