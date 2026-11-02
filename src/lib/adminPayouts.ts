import "server-only";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db, profiles, purchases } from "@/lib/db";
import type { PayoutPurchase } from "@/lib/payouts";

/** Purchases of referred customers (2 Nov 2026), for the payout estimate on /admin/payouts. */
export async function listReferredPurchases(): Promise<PayoutPurchase[]> {
  const rows = await db()
    .select({ referredBy: profiles.referredBy, kind: purchases.kind, amountCents: purchases.amountCents, currency: purchases.currency, status: purchases.status, createdAt: purchases.createdAt, userId: purchases.userId })
    .from(purchases)
    .innerJoin(profiles, eq(profiles.userId, purchases.userId))
    .where(isNotNull(profiles.referredBy))
    .orderBy(desc(purchases.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
