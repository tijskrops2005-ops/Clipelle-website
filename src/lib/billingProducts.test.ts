import { describe, expect, it } from "vitest";
import { PLANS, TOPUPS } from "./plans";
import { packDescription, planDescription } from "./billingProducts";

describe("product descriptions on the checkout page", () => {
  it("say what a plan and a pack buy, in credits, and that credits never expire", () => {
    const pro = PLANS.find((p) => p.key === "pro")!;
    expect(planDescription(pro)).toMatch(/^22 minutes of translated video a month \(1,320 credits\)/);
    expect(packDescription(TOPUPS[0])).toContain(`${TOPUPS[0].credits} credits`);
    for (const d of [planDescription(pro), packDescription(TOPUPS[0])]) {
      expect(d).toContain("Credits never expire");
      expect(d.length).toBeLessThan(300);
      expect(d).not.toMatch(/\$/);
    }
  });
});
