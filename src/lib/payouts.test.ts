import { describe, expect, it } from "vitest";
import { payoutEstimate } from "./payouts";

describe("payout estimate", () => {
  it("takes 25% of paid subscription payments of referred customers, per partner and month; packs never count", () => {
    const rows = payoutEstimate([
      { referredBy: "anna", kind: "subscription", amountCents: 5900, currency: "usd", status: "paid", createdAt: "2026-10-03T10:00:00Z", userId: "u1" },
      { referredBy: "anna", kind: "subscription", amountCents: 5900, currency: "usd", status: "paid", createdAt: "2026-10-20T10:00:00Z", userId: "u2" },
      { referredBy: "anna", kind: "topup", amountCents: 2500, currency: "usd", status: "paid", createdAt: "2026-10-21T10:00:00Z", userId: "u2" },
      { referredBy: "anna", kind: "subscription", amountCents: 5900, currency: "usd", status: "refunded", createdAt: "2026-10-22T10:00:00Z", userId: "u3" },
      { referredBy: "bob", kind: "subscription", amountCents: 1900, currency: "eur", status: "paid", createdAt: "2026-11-01T10:00:00Z", userId: "u4" },
      { referredBy: null, kind: "subscription", amountCents: 9900, currency: "usd", status: "paid", createdAt: "2026-11-01T10:00:00Z", userId: "u5" },
    ]);
    expect(rows).toEqual([
      { partner: "bob", month: "2026-11", currency: "eur", customers: 1, subscriptionCents: 1900, commissionCents: 475 },
      { partner: "anna", month: "2026-10", currency: "usd", customers: 2, subscriptionCents: 11800, commissionCents: 2950 },
    ]);
  });
});
