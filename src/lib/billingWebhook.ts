import "server-only";
import type Stripe from "stripe";
import { grantPlanCredits, grantTopupCredits, setPlan, workspaceByCustomer } from "@/lib/billing";
import { PLAN_KEYS } from "@/lib/billing";
import { planByLookupKey } from "@/lib/plans";

/** Looks up a price's lookup key at Stripe (an invoice line carries only the price id). */
export type BillingDeps = { lookupKeyOfPrice: (priceId: string) => Promise<string | null> };

const defaultDeps: BillingDeps = {
  lookupKeyOfPrice: async (priceId) => {
    try {
      const { stripe } = await import("@/lib/stripe");
      return (await stripe().prices.retrieve(priceId)).lookup_key ?? null;
    } catch {
      return null; // falls back to metadata
    }
  },
};

/** Invoices that start a plan period: the first one and every renewal. A mid-period plan change does not. */
const PERIOD_INVOICES = new Set(["subscription_create", "subscription_cycle"]);

/**
 * Applies one verified Stripe event to a WORKSPACE. Pure of HTTP so it can be tested with constructed
 * events. Idempotent: credit grants carry the invoice/session id as reference; plan patches are absolute.
 * Session metadata carries workspaceId and userId (set by src/lib/billingCheckout.ts).
 *
 * 26 Oct 2026 (Stripe best practice: resolve through the object graph, metadata only as fallback):
 * the customer resolves the workspace, the PRICE resolves the plan (its lookup key), so a plan
 * changed in the customer portal is recognised; plan credits come only with an invoice that starts a
 * period (subscription_create, subscription_cycle), never twice in one period after a plan change.
 */
export async function applyStripeEvent(event: Stripe.Event, deps: BillingDeps = defaultDeps): Promise<{ handled: boolean; note?: string }> {
  switch (event.type) {
    // Fulfilment on both events (Stripe: a delayed payment method completes the session unpaid and
    // pays later). Credits only once the session is paid; the grant is idempotent on the session id.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;
      const userId = session.metadata?.userId ?? "";
      if (!workspaceId) return { handled: false, note: "no workspaceId in metadata" };
      if (session.metadata?.kind === "topup" && session.metadata.topupKey) {
        if (session.payment_status === "unpaid") return { handled: true, note: "topup waits for the payment" };
        await grantTopupCredits(workspaceId, userId, session.metadata.topupKey, session.id);
        return { handled: true, note: "topup granted" };
      }
      if (session.metadata?.kind === "plan" && typeof session.customer === "string") {
        await setPlan(workspaceId, { stripeCustomerId: session.customer, stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null });
        return { handled: true, note: "customer linked" };
      }
      return { handled: false };
    }
    case "checkout.session.async_payment_failed": {
      // The delayed payment failed: nothing was granted, so nothing to undo. Stripe tells the customer.
      const session = event.data.object as Stripe.Checkout.Session;
      return { handled: true, note: `payment failed for ${session.metadata?.kind ?? "session"}; nothing granted` };
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) return { handled: false, note: "no customer" };
      const ws = await workspaceByCustomer(customerId);
      if (!ws) return { handled: false, note: "unknown customer" };
      if (!PERIOD_INVOICES.has(invoice.billing_reason ?? "")) return { handled: true, note: `no plan credits for a ${invoice.billing_reason ?? "unknown"} invoice` };
      const line = invoice.lines?.data?.[0];
      const price = line?.pricing?.price_details?.price;
      const lookup = typeof price === "string" ? await deps.lookupKeyOfPrice(price) : price?.lookup_key ?? null;
      const planKey = planByLookupKey(lookup)?.key ?? (line?.metadata?.planKey as string | undefined) ?? (invoice.parent?.subscription_details?.metadata?.planKey as string | undefined) ?? ws.planKey;
      if (PLAN_KEYS.includes(planKey as (typeof PLAN_KEYS)[number]) && planKey !== "free") {
        await grantPlanCredits(ws.id, ws.ownerUserId, planKey, invoice.id);
        await setPlan(ws.id, { planKey, subscriptionStatus: "active" });
        return { handled: true, note: `plan credits for ${planKey}` };
      }
      return { handled: false, note: "no plan on invoice" };
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const ws = await workspaceByCustomer(customerId);
      if (!ws) return { handled: false, note: "unknown customer" };
      const planKey = planByLookupKey(sub.items.data[0]?.price?.lookup_key)?.key ?? (sub.metadata?.planKey as string | undefined) ?? ws.planKey;
      const periodEnd = sub.items.data[0]?.current_period_end;
      await setPlan(ws.id, { planKey: sub.status === "active" || sub.status === "trialing" ? planKey : ws.planKey, stripeSubscriptionId: sub.id, subscriptionStatus: sub.status, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null });
      return { handled: true, note: `subscription ${sub.status}` };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const ws = await workspaceByCustomer(customerId);
      if (!ws) return { handled: false, note: "unknown customer" };
      await setPlan(ws.id, { planKey: "free", stripeSubscriptionId: null, subscriptionStatus: "canceled", currentPeriodEnd: null });
      return { handled: true, note: "back to free" };
    }
    default:
      return { handled: false, note: `ignored ${event.type}` };
  }
}
