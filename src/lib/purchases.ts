import "server-only";
import { eq } from "drizzle-orm";
import { db, profiles, purchases } from "@/lib/db";

/**
 * Purchases (2 Nov 2026): one row per paid Stripe invoice or checkout session, with the amount the
 * customer paid including VAT, written by the webhook next to the credit grant. Idempotent on the
 * Stripe id. The terms version comes from the session metadata (checkout) or the profile (renewals).
 */
export async function recordPurchase(input: { workspaceId: string; userId: string | null; kind: "subscription" | "topup" | "auto_reload"; item: string; credits: number; amountCents: number; currency: string; stripeRef: string; termsVersion?: string | null; termsAcceptedAt?: Date | null }) {
  let termsVersion = input.termsVersion ?? null;
  let termsAcceptedAt = input.termsAcceptedAt ?? null;
  if (!termsVersion && input.userId) {
    const [p] = await db().select({ v: profiles.termsVersion, at: profiles.termsAcceptedAt }).from(profiles).where(eq(profiles.userId, input.userId)).limit(1);
    termsVersion = p?.v ?? null;
    termsAcceptedAt = p?.at ?? null;
  }
  await db()
    .insert(purchases)
    .values({ workspaceId: input.workspaceId, userId: input.userId, kind: input.kind, item: input.item, credits: Math.round(input.credits), amountCents: Math.round(input.amountCents), currency: input.currency.toLowerCase(), status: "paid", stripeRef: input.stripeRef, termsVersion, termsAcceptedAt })
    .onConflictDoNothing();
}
