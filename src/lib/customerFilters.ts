/**
 * The customer list on /admin/customers (2 Nov 2026): one row per account, the filter chips and
 * their counts. Pure over rows the server assembled, so the counts are tested without a database.
 */
export type CustomerRow = {
  userId: string;
  workspaceId: string | null;
  name: string | null;
  email: string;
  signedUpAt: string;
  planKey: string;
  subscriptionStatus: string | null;
  referredBy: string | null;
  balance: number;
  /** Everything ever paid, in cents, including VAT (from purchases). */
  paidCents: number;
  /** How many purchases were subscriptions / top-ups. */
  subscriptionPurchases: number;
  topupPurchases: number;
  lastActiveAt: string | null;
  totpEnabled: boolean;
  deletionRequestedAt: string | null;
};

export type CustomerFilter = "all" | "free" | "subscribed" | "topups" | "canceled" | "negative" | "referred";

export const CUSTOMER_FILTERS: { key: CustomerFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "free", label: "Free (never paid)" },
  { key: "subscribed", label: "Subscribed" },
  { key: "topups", label: "Top-ups only" },
  { key: "canceled", label: "Canceled" },
  { key: "negative", label: "Negative balance" },
  { key: "referred", label: "Referred" },
];

export function matchesFilter(c: CustomerRow, filter: CustomerFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "free":
      return c.paidCents === 0;
    case "subscribed":
      return c.planKey !== "free" && (c.subscriptionStatus === "active" || c.subscriptionStatus === "trialing" || c.subscriptionStatus === "canceling" || c.subscriptionStatus === "past_due" || c.subscriptionStatus === null);
    case "topups":
      return c.topupPurchases > 0 && c.subscriptionPurchases === 0;
    case "canceled":
      return c.subscriptionStatus === "canceled" || c.subscriptionStatus === "canceling";
    case "negative":
      return c.balance < 0;
    case "referred":
      return Boolean(c.referredBy);
  }
}

export function filterCounts(rows: CustomerRow[]): Record<CustomerFilter, number> {
  const out = Object.fromEntries(CUSTOMER_FILTERS.map((f) => [f.key, 0])) as Record<CustomerFilter, number>;
  for (const r of rows) for (const f of CUSTOMER_FILTERS) if (matchesFilter(r, f.key)) out[f.key]++;
  return out;
}

/** Name and e-mail search, case-insensitive, every word must match somewhere. */
export function matchesQuery(c: CustomerRow, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${c.name ?? ""} ${c.email}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export type CustomerSort = "newest" | "oldest";

export function sortCustomers(rows: CustomerRow[], sort: CustomerSort): CustomerRow[] {
  return [...rows].sort((a, b) => (sort === "newest" ? b.signedUpAt.localeCompare(a.signedUpAt) : a.signedUpAt.localeCompare(b.signedUpAt)));
}

/** The four numbers above the table. */
export function customerStats(rows: CustomerRow[]) {
  return {
    users: rows.length,
    paying: rows.filter((r) => r.paidCents > 0).length,
    revenueCents: rows.reduce((s, r) => s + r.paidCents, 0),
    creditsOutstanding: rows.reduce((s, r) => s + Math.max(0, r.balance), 0),
  };
}

export function paginate<T>(rows: T[], page: number, perPage: number) {
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((current - 1) * perPage, current * perPage), page: current, pages, total: rows.length };
}
