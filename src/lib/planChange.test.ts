import { describe, expect, it } from "vitest";
import { planByKey } from "./plans";
import { planChange } from "./planChange";

const free = planByKey("free")!;
const pro = planByKey("pro")!;
const pro2 = planByKey("pro_2")!;
const starter = planByKey("starter")!;
const now = new Date("2026-10-26T12:00:00Z");

describe("the confirm window before checkout (26 Oct 2026)", () => {
  it("shows a trial as nothing today, 30 credits now and the plan after seven days", () => {
    const c = planChange({ from: free, to: pro, interval: "monthly", currency: "eur", trialAvailable: true, hasSubscription: false, now });
    expect(c).toMatchObject({ mode: "trial", dueToday: 0, amount: 59, creditsBefore: 0, creditsAfter: 1320, direction: "upgrade" });
    expect(c.trialEnds?.toISOString()).toBe("2026-11-02T12:00:00.000Z");
  });

  it("charges the price today without a trial, the year's total on annual billing (whole dollars a month: $73 × 12)", () => {
    const c = planChange({ from: free, to: pro2, interval: "annual", currency: "usd", trialAvailable: false, hasSubscription: false, now });
    expect(c).toMatchObject({ mode: "new", dueToday: 876, amount: 876, trialEnds: null, creditsAfter: 1980 });
  });

  it("leaves the amount of a plan change to the portal, and names the direction", () => {
    expect(planChange({ from: pro, to: pro2, interval: "monthly", currency: "usd", trialAvailable: false, hasSubscription: true })).toMatchObject({ mode: "change", dueToday: null, direction: "upgrade", creditsBefore: 1320, creditsAfter: 1980 });
    expect(planChange({ from: pro, to: starter, interval: "monthly", currency: "usd", trialAvailable: true, hasSubscription: true })).toMatchObject({ mode: "change", direction: "downgrade" });
  });
});
