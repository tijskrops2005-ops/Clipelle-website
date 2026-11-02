import { describe, expect, it } from "vitest";
import { effectiveLimit, limitCaps, normalizeLimits } from "./customerLimits";

describe("customer limits", () => {
  it("reads the caps from the environment with sane defaults", () => {
    expect(limitCaps({})).toEqual({ dailyUsd: 500, monthlyUsd: 5000, concurrentProjects: 50 });
    expect(limitCaps({ ADMIN_LIMIT_CAP_DAILY_USD: "250", ADMIN_LIMIT_CAP_CONCURRENT: "x" })).toEqual({ dailyUsd: 250, monthlyUsd: 5000, concurrentProjects: 50 });
  });

  it("never stores more than the cap, drops zero and nonsense", () => {
    const caps = { dailyUsd: 300, monthlyUsd: 2000, concurrentProjects: 10 };
    expect(normalizeLimits({ dailyUsd: "1000", monthlyUsd: 150.6, concurrentProjects: 0 }, caps)).toEqual({ dailyUsd: 300, monthlyUsd: 151 });
    expect(normalizeLimits({ dailyUsd: "-5", monthlyUsd: "abc", concurrentProjects: 99 }, caps)).toEqual({ concurrentProjects: 10 });
    expect(normalizeLimits({}, caps)).toEqual({});
  });

  it("applies a customer's own limit only when it raises the default, and never above the cap", () => {
    expect(effectiveLimit(undefined, 100, 500)).toBe(100);
    expect(effectiveLimit(50, 100, 500)).toBe(100);
    expect(effectiveLimit(250, 100, 500)).toBe(250);
    expect(effectiveLimit(9999, 100, 500)).toBe(500);
  });
});
