import type { Plan, TopupPack } from "@/lib/plans";

/**
 * Pure builders for the Stripe Checkout sessions, so a test can prove what each kind sends.
 * Partner program: referrals are matched by the partner platform on the customer's e-mail or the
 * customer id; our checkout only passes the customer and plain metadata. Credit packs must never
 * earn commission, so their product and price carry `commissions_disabled: "yes"` (set by
 * scripts/stripe-setup.ts) and their session carries no referral-related data at all.
 */
export const TOPUP_METADATA = { commissions_disabled: "yes" } as const;

/**
 * Tags every Checkout Session so the Dashboard can tell this flow apart (Stripe best practice on
 * API 2026-03-25.dahlia and later: a label with a suffix of 8 random letters). Not a secret.
 */
export const CHECKOUT_INTEGRATION_ID = "clipelle_checkout_qhzkwmpa";

export type CheckoutInput = { customerId: string; userId: string; workspaceId: string; priceId: string; origin: string; /** Stripe Managed Payments (merchant of record) on this session. */ managed?: boolean };

/**
 * Stripe Managed Payments, Stripe as merchant of record (26 Oct 2026). Off unless
 * STRIPE_MANAGED_PAYMENTS is "true", "1" or "on". It also has to be switched on in the Stripe
 * Dashboard (Settings → Managed Payments, terms accepted) and every product needs an eligible tax code
 * (STRIPE_PRODUCT_TAX_CODE, set by scripts/stripe-setup.ts).
 */
export function managedPaymentsEnabled(env: Record<string, string | undefined> = process.env) {
  return ["true", "1", "on", "yes"].includes((env.STRIPE_MANAGED_PAYMENTS ?? "").trim().toLowerCase());
}

/**
 * Product tax code for every Clipelle product: "Artificial Intelligence as a Service (AIaaS) - Cloud
 * Based - Business Use", eligible for Managed Payments (docs.stripe.com/payments/managed-payments/eligibility).
 * Override with STRIPE_TAX_CODE if the accountant picks another eligible code.
 */
export const STRIPE_PRODUCT_TAX_CODE = process.env.STRIPE_TAX_CODE?.trim() || "txcd_10105002";

/**
 * Parameters Stripe manages itself under Managed Payments and that must not be sent, per mode
 * (docs.stripe.com/payments/managed-payments/update-checkout#remove-unsupported-parameters, read
 * 26 Oct 2026). Dotted names are nested. Our sessions send none of them today; the list keeps it so.
 */
export const MANAGED_PAYMENTS_UNSUPPORTED = {
  subscription: ["adaptive_pricing", "automatic_tax", "tax_id_collection", "subscription_data.default_tax_rates", "payment_method_configuration", "payment_method_types", "customer_update.name", "customer_update.address", "shipping_address_collection", "shipping_options", "subscription_data.application_fee_percent", "subscription_data.on_behalf_of", "subscription_data.transfer_data", "subscription_data.invoice_settings", "invoice_creation"],
  payment: ["automatic_tax", "tax_id_collection", "excluded_payment_method_types", "adaptive_pricing", "payment_method_configuration", "payment_method_types", "customer_update.name", "customer_update.address", "shipping_address_collection", "shipping_options", "payment_intent_data.shipping", "payment_intent_data.application_fee_amount", "payment_intent_data.on_behalf_of", "payment_intent_data.transfer_data", "payment_intent_data.transfer_group", "invoice_creation", "payment_intent_data.statement_descriptor", "payment_intent_data.statement_descriptor_suffix", "payment_intent_data.receipt_email"],
} as const;

/** Turns Managed Payments on for a session and drops what Stripe manages itself; off: unchanged. */
export function withManagedPayments<T extends { mode: "subscription" | "payment" }>(params: T, managed: boolean | undefined): T & { managed_payments?: { enabled: true } } {
  if (!managed) return params;
  const out: Record<string, unknown> = structuredClone(params);
  for (const path of MANAGED_PAYMENTS_UNSUPPORTED[params.mode]) {
    const [head, tail] = path.split(".");
    if (!tail) {
      delete out[head];
      continue;
    }
    const nested = out[head] as Record<string, unknown> | undefined;
    if (nested && typeof nested === "object") {
      delete nested[tail];
      if (Object.keys(nested).length === 0) delete out[head];
    }
  }
  return { ...(out as T), managed_payments: { enabled: true } };
}

export function subscriptionSessionParams(plan: Plan, input: CheckoutInput) {
  return withManagedPayments({
    mode: "subscription" as const,
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.origin}/settings/billing?checkout=success`,
    cancel_url: `${input.origin}/settings/billing?checkout=cancelled`,
    subscription_data: { metadata: { userId: input.userId, workspaceId: input.workspaceId, planKey: plan.key } },
    metadata: { userId: input.userId, workspaceId: input.workspaceId, planKey: plan.key, kind: "plan" },
    allow_promotion_codes: true,
    integration_identifier: CHECKOUT_INTEGRATION_ID,
  }, input.managed);
}

export function topupSessionParams(pack: TopupPack, input: CheckoutInput) {
  return withManagedPayments({
    mode: "payment" as const,
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.origin}/settings/billing?checkout=success`,
    cancel_url: `${input.origin}/settings/billing?checkout=cancelled`,
    metadata: { userId: input.userId, workspaceId: input.workspaceId, topupKey: pack.key, kind: "topup" },
    integration_identifier: CHECKOUT_INTEGRATION_ID,
  }, input.managed);
}

/** Keys a referral could be matched on; a top-up session must contain none of them. */
export const REFERRAL_KEYS = ["client_reference_id", "referral", "referral_id", "affiliate", "affiliate_slug", "gr_id", "red"];
