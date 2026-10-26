import { describe, expect, it } from "vitest";
import { DEFAULT_AUTO_RELOAD, shouldAutoReload, validAutoReload } from "./autoReload";

const now = new Date("2026-10-26T12:00:00Z");
const on = { ...DEFAULT_AUTO_RELOAD, enabled: true };

describe("auto-reload rules (26 Oct 2026)", () => {
  it("reloads only when on, on a paid plan, below the threshold", () => {
    expect(shouldAutoReload({ settings: on, balance: 50, planKey: "pro", now })).toEqual({ go: true });
    expect(shouldAutoReload({ settings: DEFAULT_AUTO_RELOAD, balance: 50, planKey: "pro", now })).toMatchObject({ go: false, reason: "off" });
    expect(shouldAutoReload({ settings: on, balance: 50, planKey: "free", now })).toMatchObject({ go: false });
    expect(shouldAutoReload({ settings: on, balance: 100, planKey: "pro", now })).toMatchObject({ go: false, reason: "balance high enough" });
  });
  it("never more than the monthly maximum, never twice within ten minutes", () => {
    expect(shouldAutoReload({ settings: { ...on, month: "2026-10", count: 3 }, balance: 0, planKey: "pro", now })).toMatchObject({ reason: "monthly maximum reached" });
    expect(shouldAutoReload({ settings: { ...on, month: "2026-09", count: 3 }, balance: 0, planKey: "pro", now })).toEqual({ go: true });
    expect(shouldAutoReload({ settings: { ...on, lastAt: "2026-10-26T11:55:00Z" }, balance: 0, planKey: "pro", now })).toMatchObject({ reason: "cooling down" });
  });
  it("accepts only the offered amounts", () => {
    expect(validAutoReload(DEFAULT_AUTO_RELOAD)).toBe(true);
    expect(validAutoReload({ ...DEFAULT_AUTO_RELOAD, addCredits: 123 })).toBe(false);
  });
});
