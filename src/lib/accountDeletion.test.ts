import { describe, expect, it } from "vitest";
import { daysUntilDeletion, deletionDate, deletionDue } from "./accountDeletion";

describe("account deletion schedule", () => {
  const requested = new Date("2026-11-02T12:00:00Z");
  it("removes thirty days after the request, not before", () => {
    expect(deletionDate(requested).toISOString()).toBe("2026-12-02T12:00:00.000Z");
    expect(deletionDue(requested, new Date("2026-12-02T11:59:59Z"))).toBe(false);
    expect(deletionDue(requested, new Date("2026-12-02T12:00:00Z"))).toBe(true);
    expect(deletionDue(null)).toBe(false);
    expect(daysUntilDeletion(requested, new Date("2026-11-20T12:00:00Z"))).toBe(12);
    expect(daysUntilDeletion(requested, new Date("2026-12-05T12:00:00Z"))).toBe(0);
  });
});
