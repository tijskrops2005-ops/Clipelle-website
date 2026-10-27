import { describe, expect, it } from "vitest";
import { addMonthsClamped, annualMonthsDue, annualReference, parseAnnualReference } from "./annualCredits";

describe("annual plans: paid once, credits every month (27 Oct 2026)", () => {
  const paid = new Date("2026-01-31T10:00:00Z");
  it("starts each month on the same day, or the month's last day", () => {
    expect(addMonthsClamped(paid, 1).toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(addMonthsClamped(paid, 2).toISOString()).toBe("2026-03-31T10:00:00.000Z");
    expect(addMonthsClamped(paid, 11).toISOString()).toBe("2026-12-31T10:00:00.000Z");
  });
  it("counts the months that have started, from 1 to 12", () => {
    expect(annualMonthsDue(paid, paid)).toBe(1);
    expect(annualMonthsDue(paid, new Date("2026-02-27T12:00:00Z"))).toBe(1);
    expect(annualMonthsDue(paid, new Date("2026-02-28T10:00:00Z"))).toBe(2);
    expect(annualMonthsDue(paid, new Date("2026-06-15T00:00:00Z"))).toBe(5);
    expect(annualMonthsDue(paid, new Date("2028-01-01T00:00:00Z"))).toBe(12);
  });
  it("round-trips the ledger reference", () => {
    expect(parseAnnualReference(annualReference("in_1", "starter", 3))).toEqual({ invoiceId: "in_1", planKey: "starter", month: 3 });
    expect(parseAnnualReference("invoice:in_1")).toBeNull();
  });
});
