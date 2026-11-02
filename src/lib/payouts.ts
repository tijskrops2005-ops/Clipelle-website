/**
 * Partner payout estimate (2 Nov 2026): 25% of the subscription payments of referred customers,
 * per partner and per month. Credit packs and auto-reloads never count. The real payouts happen at
 * the partner platform; this is the estimate shown on /admin/payouts. Pure and tested.
 */
export const PARTNER_COMMISSION = 0.25;

export type PayoutPurchase = { referredBy: string | null; kind: string; amountCents: number; currency: string; status: string; createdAt: string; userId: string | null };

export type PartnerMonth = { partner: string; month: string; currency: string; customers: number; subscriptionCents: number; commissionCents: number };

export function monthOf(iso: string) {
  return iso.slice(0, 7);
}

export function payoutEstimate(purchases: PayoutPurchase[]): PartnerMonth[] {
  const map = new Map<string, PartnerMonth & { users: Set<string> }>();
  for (const p of purchases) {
    if (!p.referredBy || p.kind !== "subscription" || p.status !== "paid") continue;
    const key = `${p.referredBy}|${monthOf(p.createdAt)}|${p.currency}`;
    const row = map.get(key) ?? { partner: p.referredBy, month: monthOf(p.createdAt), currency: p.currency, customers: 0, subscriptionCents: 0, commissionCents: 0, users: new Set<string>() };
    row.subscriptionCents += p.amountCents;
    if (p.userId) row.users.add(p.userId);
    map.set(key, row);
  }
  return [...map.values()]
    .map(({ users, ...r }) => ({ ...r, customers: users.size, commissionCents: Math.round(r.subscriptionCents * PARTNER_COMMISSION) }))
    .sort((a, b) => b.month.localeCompare(a.month) || a.partner.localeCompare(b.partner));
}
