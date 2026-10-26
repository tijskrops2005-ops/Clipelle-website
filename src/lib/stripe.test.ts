import { describe, expect, it } from "vitest";
import { isTestKey } from "./stripe";

describe("stripe keys", () => {
  it("accepts restricted and secret test keys and refuses live or other keys", () => {
    expect(isTestKey("rk_test_abc")).toBe(true);
    expect(isTestKey("sk_test_abc")).toBe(true);
    expect(isTestKey("sk_live_abc")).toBe(false);
    expect(isTestKey("rk_live_abc")).toBe(false);
    expect(isTestKey("pk_test_abc")).toBe(false);
    expect(isTestKey(undefined)).toBe(false);
  });
});
