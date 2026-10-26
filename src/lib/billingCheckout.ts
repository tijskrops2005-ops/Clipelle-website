import { TRIAL, type Currency, type Plan, type TopupPack } from "@/lib/plans";
import { companyLine } from "@/content/company";

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

export type CheckoutInput = {
  customerId: string;
  userId: string;
  workspaceId: string;
  priceId: string;
  origin: string;
  /** Stripe Managed Payments (merchant of record) on this session. */
  managed?: boolean;
  /** Stripe Tax on this session (only without Managed Payments; needs an active tax registration). */
  automaticTax?: boolean;
  /** The terms checkbox (needs the terms URL in the Stripe Dashboard). */
  requireTerms?: boolean;
  /** Start with the free trial (TRIAL.days, card required): only for a workspace that never had one. */
  trial?: boolean;
  /** Which amount of the price to charge: dollars, or the price's euro option. Default dollars. */
  currency?: Currency;
};

/**
 * The currency of a checkout: a Stripe customer that already paid in one currency keeps it (Stripe
 * does not mix currencies on one customer's subscriptions and invoices); otherwise what the
 * customer picked on Billing, and dollars when nothing was picked.
 */
export function checkoutCurrency(requested: Currency | undefined, customerCurrency: string | null | undefined): Currency {
  if (customerCurrency === "eur" || customerCurrency === "usd") return customerCurrency;
  return requested ?? "usd";
}

function termsParams(on: boolean | undefined) {
  return on ? { consent_collection: { terms_of_service: "required" as const } } : {};
}

/**
 * Stripe Tax for our own sales, when Managed Payments is off. Off unless STRIPE_AUTOMATIC_TAX is
 * "true". Turn it on only after adding a tax registration in Stripe (Dashboard → Tax →
 * Registrations): without one Stripe calculates and collects no tax and reports no error. With it,
 * the session collects the billing address, lets businesses enter their VAT number (reverse charge)
 * and adds VAT on top of the price (tax_behavior unspecified = exclusive).
 */
export function automaticTaxEnabled(env: Record<string, string | undefined> = process.env) {
  return ["true", "1", "on", "yes"].includes((env.STRIPE_AUTOMATIC_TAX ?? "").trim().toLowerCase());
}

/**
 * The "I agree to the Terms of Service and Privacy Policy" checkbox on the Checkout page. Off unless
 * STRIPE_REQUIRE_TERMS is "true": Stripe refuses the session until the terms URL is set in the
 * Dashboard (Settings → Public details → Terms of service), so switch it on after that.
 */
export function termsConsentEnabled(env: Record<string, string | undefined> = process.env) {
  return ["true", "1", "on", "yes"].includes((env.STRIPE_REQUIRE_TERMS ?? "").trim().toLowerCase());
}

/** Our company line (name, address, KvK, VAT) on every invoice: Dutch invoice rules. */
export const INVOICE_FOOTER = companyLine("en");

/** The tax part of a session; Managed Payments strips it again, since Stripe then handles tax itself. */
function taxParams(on: boolean | undefined) {
  return on ? { automatic_tax: { enabled: true }, tax_id_collection: { enabled: true }, customer_update: { address: "auto" as const, name: "auto" as const } } : {};
}

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
    currency: input.currency ?? "usd",
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.origin}/settings/billing?checkout=success`,
    cancel_url: `${input.origin}/settings/billing?checkout=cancelled`,
    subscription_data: {
      metadata: { userId: input.userId, workspaceId: input.workspaceId, planKey: plan.key },
      // The free trial (26 Oct 2026): nothing is charged for TRIAL.days; a card is required, and
      // without one at the end the subscription is cancelled instead of left unpaid.
      ...(input.trial ? { trial_period_days: TRIAL.days, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } } : {}),
    },
    ...(input.trial ? { payment_method_collection: "always" as const } : {}),
    metadata: { userId: input.userId, workspaceId: input.workspaceId, planKey: plan.key, kind: "plan", ...(input.trial ? { trial: "yes" } : {}) },
    allow_promotion_codes: true,
    integration_identifier: CHECKOUT_INTEGRATION_ID,
    ...taxParams(input.automaticTax),
    ...termsParams(input.requireTerms),
  }, input.managed);
}

export function topupSessionParams(pack: TopupPack, input: CheckoutInput) {
  return withManagedPayments({
    mode: "payment" as const,
    customer: input.customerId,
    currency: input.currency ?? "usd",
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.origin}/settings/billing?checkout=success`,
    cancel_url: `${input.origin}/settings/billing?checkout=cancelled`,
    metadata: { userId: input.userId, workspaceId: input.workspaceId, topupKey: pack.key, kind: "topup" },
    integration_identifier: CHECKOUT_INTEGRATION_ID,
    // A real invoice (PDF, our company details) for a credit pack, not only a receipt. Managed
    // Payments issues its own invoices and strips this.
    invoice_creation: { enabled: true, invoice_data: { footer: INVOICE_FOOTER, metadata: { workspaceId: input.workspaceId, kind: "topup" } } },
    // "Add promotion code" on packs too (26 Oct 2026), as on plans.
    allow_promotion_codes: true,
    ...taxParams(input.automaticTax),
    ...termsParams(input.requireTerms),
  }, input.managed);
}

/** Keys a referral could be matched on; a top-up session must contain none of them. */
export const REFERRAL_KEYS = ["client_reference_id", "referral", "referral_id", "affiliate", "affiliate_slug", "gr_id", "red"];
