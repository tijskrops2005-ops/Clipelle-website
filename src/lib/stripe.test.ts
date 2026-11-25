import { describe, expect, it } from "vitest";
import { isTestKey, stripeKeyAllowed } from "./stripe";

describe("stripe keys", () => {
  it("accepts restricted and secret test keys and refuses live or other keys", () => {
    expect(isTestKey("rk_test_abc")).toBe(true);
    expect(isTestKey("sk_test_abc")).toBe(true);
    expect(isTestKey("sk_live_abc")).toBe(false);
    expect(isTestKey("rk_live_abc")).toBe(false);
    expect(isTestKey("pk_test_abc")).toBe(false);
    expect(isTestKey(undefined)).toBe(false);
  });

  it("accepts a live key only with the live switch", () => {
    expect(stripeKeyAllowed("rk_test_abc", undefined)).toBe(true);
    expect(stripeKeyAllowed("rk_live_abc", undefined)).toBe(false);
    expect(stripeKeyAllowed("sk_live_abc", "off")).toBe(false);
    expect(stripeKeyAllowed("rk_live_abc", "on")).toBe(true);
    expect(stripeKeyAllowed("pk_live_abc", "on")).toBe(false);
    expect(stripeKeyAllowed(undefined, "on")).toBe(false);
  });
});
