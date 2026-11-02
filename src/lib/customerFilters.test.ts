import { describe, expect, it } from "vitest";
import { customerStats, filterCounts, matchesQuery, paginate, sortCustomers, type CustomerRow } from "./customerFilters";

const base: CustomerRow = { userId: "u", workspaceId: "w", name: null, email: "a@x.io", signedUpAt: "2026-10-01T00:00:00Z", planKey: "free", subscriptionStatus: null, referredBy: null, balance: 30, paidCents: 0, subscriptionPurchases: 0, topupPurchases: 0, lastActiveAt: null, totpEnabled: false, deletionRequestedAt: null };
const rows: CustomerRow[] = [
  { ...base, userId: "free" },
  { ...base, userId: "pro", name: "Noah Onis", email: "noah@example.com", planKey: "pro", subscriptionStatus: "active", paidCents: 5900, subscriptionPurchases: 1, signedUpAt: "2026-10-20T00:00:00Z" },
  { ...base, userId: "topup", email: "t@example.com", paidCents: 2500, topupPurchases: 1, balance: -10, referredBy: "partner-x", signedUpAt: "2026-10-10T00:00:00Z" },
  { ...base, userId: "canceled", planKey: "starter", subscriptionStatus: "canceling", paidCents: 1900, subscriptionPurchases: 1 },
];

describe("customer filters", () => {
  it("counts every chip", () => {
    expect(filterCounts(rows)).toEqual({ all: 4, free: 1, subscribed: 2, topups: 1, canceled: 1, negative: 1, referred: 1 });
  });

  it("adds the four numbers up", () => {
    expect(customerStats(rows)).toEqual({ users: 4, paying: 3, revenueCents: 10300, creditsOutstanding: 90 });
  });

  it("searches name and e-mail, sorts newest first, and paginates", () => {
    expect(rows.filter((r) => matchesQuery(r, "noah")).map((r) => r.userId)).toEqual(["pro"]);
    expect(rows.filter((r) => matchesQuery(r, "example onis")).map((r) => r.userId)).toEqual(["pro"]);
    expect(rows.filter((r) => matchesQuery(r, "")).length).toBe(4);
    expect(sortCustomers(rows, "newest")[0].userId).toBe("pro");
    expect(sortCustomers(rows, "oldest")[0].userId).toBe("free");
    const p = paginate(rows, 2, 3);
    expect(p).toMatchObject({ page: 2, pages: 2, total: 4 });
    expect(p.rows).toHaveLength(1);
    expect(paginate(rows, 9, 3).page).toBe(2);
  });
});
