import type { Plan, TopupPack } from "@/lib/plans";

/**
 * Pure builders for the Stripe Checkout sessions, so a test can prove what each kind sends.
 * Partner program: referrals are matched by the partner platform on the customer's e-mail or the
 * customer id; our checkout only passes the customer and plain metadata. Credit packs must never
 * earn commission, so their product and price carry `commissions_disabled: "yes"` (set by
 * scripts/stripe-setup.ts) and their session carries no referral-related data at all.
 */
export const TOPUP_METADATA = { commissions_disabled: "yes" } as const;

export type CheckoutInput = { customerId: string; userId: string; priceId: string; origin: string };

export function subscriptionSessionParams(plan: Plan, input: CheckoutInput) {
  return {
    mode: "subscription" as const,
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.origin}/settings/billing?checkout=success`,
    cancel_url: `${input.origin}/settings/billing?checkout=cancelled`,
    subscription_data: { metadata: { userId: input.userId, planKey: plan.key } },
    metadata: { userId: input.userId, planKey: plan.key, kind: "plan" },
    allow_promotion_codes: true,
  };
}

export function topupSessionParams(pack: TopupPack, input: CheckoutInput) {
  return {
    mode: "payment" as const,
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.origin}/settings/billing?checkout=success`,
    cancel_url: `${input.origin}/settings/billing?checkout=cancelled`,
    metadata: { userId: input.userId, topupKey: pack.key, kind: "topup" },
  };
}

/** Keys a referral could be matched on; a top-up session must contain none of them. */
export const REFERRAL_KEYS = ["client_reference_id", "referral", "referral_id", "affiliate", "affiliate_slug", "gr_id", "red"];
