import { brand, siteUrl } from "@/lib/brand";

/**
 * The Stripe customer portal, configured from code (26 Oct 2026, Stripe best practice: self-service
 * plan changes, cancellation and card updates in the portal). Two configurations, so a personal
 * workspace can only switch between individual plans and a team workspace only between Business
 * levels. scripts/stripe-setup.ts creates or updates them; /api/billing/portal picks one by
 * `metadata.clipelle_portal`. Browser-safe and pure, so a test can check what is sent.
 */
export type PortalKind = "individual" | "team";
export type PortalProduct = { product: string; prices: string[] };

export function portalConfigurationParams(kind: PortalKind, products: PortalProduct[], site = siteUrl()) {
  return {
    name: kind === "team" ? `${brand.name} team plans` : `${brand.name} plans`,
    metadata: { clipelle_portal: kind },
    default_return_url: `${site}/settings/billing`,
    business_profile: {
      headline: `Manage your ${brand.name} plan`,
      privacy_policy_url: `${site}/legal/privacy`,
      terms_of_service_url: `${site}/legal/terms`,
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      // Name, address and VAT number appear on the invoices.
      customer_update: { enabled: true, allowed_updates: ["email", "name", "address", "tax_id"] as ("email" | "name" | "address" | "tax_id")[] },
      // Cancelling keeps the plan until the period ends; credits never expire either way.
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end" as const,
        cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "unused", "switched_service", "other"] as ("too_expensive" | "missing_features" | "unused" | "switched_service" | "other")[] },
      },
      // Upgrades apply now without a proration invoice (the new plan's credits come with the next
      // period, see billingWebhook.ts); downgrades and shorter intervals wait for the period end.
      subscription_update: {
        enabled: products.length > 0,
        default_allowed_updates: ["price"] as "price"[],
        proration_behavior: "none" as const,
        products,
        schedule_at_period_end: { conditions: [{ type: "decreasing_item_amount" as const }, { type: "shortening_interval" as const }] },
      },
    },
  };
}
