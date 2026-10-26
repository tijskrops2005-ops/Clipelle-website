import "server-only";
import type Stripe from "stripe";
import { grantPlanCredits, grantTopupCredits, grantTrialCredits, setPlan, workspaceByCustomer } from "@/lib/billing";
import { PLAN_KEYS } from "@/lib/billing";
import { CUSTOM_CREDITS, planByLookupKey, validCustomCredits } from "@/lib/plans";
import { notifyAddress, sendEmail } from "@/lib/email";

/** Looks up a price's lookup key at Stripe (an invoice line carries only the price id). */
export type BillingDeps = { lookupKeyOfPrice: (priceId: string) => Promise<string | null>; subscriptionStatus?: (subscriptionId: string) => Promise<string | null> };

const defaultDeps: BillingDeps = {
  lookupKeyOfPrice: async (priceId) => {
    try {
      const { stripe } = await import("@/lib/stripe");
      return (await stripe().prices.retrieve(priceId)).lookup_key ?? null;
    } catch {
      return null; // falls back to metadata
    }
  },
  subscriptionStatus: async (subscriptionId) => {
    try {
      const { stripe } = await import("@/lib/stripe");
      return (await stripe().subscriptions.retrieve(subscriptionId)).status;
    } catch {
      return null;
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
        if (session.metadata.topupKey === "custom") {
          // A free amount: the credits in the metadata must match what was charged before discounts.
          const credits = Number(session.metadata.credits);
          if (!validCustomCredits(credits) || session.amount_subtotal !== credits * CUSTOM_CREDITS.unitCents) return { handled: false, note: "custom credits do not match the amount" };
          await grantTopupCredits(workspaceId, userId, "custom", session.id, credits);
          return { handled: true, note: "topup granted" };
        }
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
      // The €0 invoice that opens a free trial: the trial credits come with the subscription event,
      // the plan's credits with the first real payment after the trial.
      const subId = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subId === "string" ? subId : subId?.id;
      if (invoice.billing_reason === "subscription_create" && (invoice.amount_paid ?? 0) === 0 && subscriptionId && (await deps.subscriptionStatus?.(subscriptionId)) === "trialing") {
        return { handled: true, note: "trial started; plan credits come with the first payment" };
      }
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
      // The free trial: 30 credits now (once per subscription), and the workspace has used its trial.
      if (sub.status === "trialing") {
        await grantTrialCredits(ws.id, ws.ownerUserId, sub.id);
        if (!ws.trialStartedAt) await setPlan(ws.id, { trialStartedAt: new Date() });
      }
      // Cancelled in the portal for the end of the period: still active until then, shown as "ends on".
      const status = sub.status === "active" && (sub.cancel_at_period_end || sub.cancel_at) ? "canceling" : sub.status;
      await setPlan(ws.id, { planKey: sub.status === "active" || sub.status === "trialing" ? planKey : ws.planKey, stripeSubscriptionId: sub.id, subscriptionStatus: status, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null });
      return { handled: true, note: `subscription ${status}` };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const ws = await workspaceByCustomer(customerId);
      if (!ws) return { handled: false, note: "unknown customer" };
      await setPlan(ws.id, { planKey: "free", stripeSubscriptionId: null, subscriptionStatus: "canceled", currentPeriodEnd: null });
      return { handled: true, note: "back to free" };
    }
    case "invoice.payment_failed": {
      // A renewal failed. The plan stays (Smart Retries and Stripe's e-mails take over, set in the
      // Dashboard); the Billing page shows the state and the way to update the card. No credits move.
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const ws = customerId ? await workspaceByCustomer(customerId) : null;
      if (!ws) return { handled: false, note: "unknown customer" };
      await setPlan(ws.id, { subscriptionStatus: "past_due" });
      return { handled: true, note: `payment failed (attempt ${invoice.attempt_count ?? 1})` };
    }
    case "charge.dispute.created":
    case "charge.refunded":
    case "radar.early_fraud_warning.created": {
      // Money at risk or returned: tell the operator at once. Credits are not touched automatically;
      // what to do is a decision per case (with Managed Payments, Stripe handles the dispute itself).
      const o = event.data.object as { id: string; amount?: number; currency?: string; charge?: string | { id: string }; customer?: string | { id: string } | null };
      const charge = typeof o.charge === "string" ? o.charge : o.charge?.id ?? (event.type === "charge.refunded" ? o.id : undefined);
      const customer = typeof o.customer === "string" ? o.customer : o.customer?.id;
      const to = notifyAddress();
      if (to) {
        const amount = typeof o.amount === "number" ? `${(o.amount / 100).toFixed(2)} ${(o.currency ?? "").toUpperCase()}` : "unknown amount";
        await sendEmail({ to, subject: `Stripe: ${event.type}`, text: `Stripe sent ${event.type} (${event.id}).\nCharge: ${charge ?? "unknown"}\nCustomer: ${customer ?? "unknown"}\nAmount: ${amount}\n\nCredits were not changed. Look it up in the Stripe Dashboard and decide what to do.` }).catch(() => undefined);
      }
      return { handled: true, note: `${event.type} reported` };
    }
    default:
      return { handled: false, note: `ignored ${event.type}` };
  }
}
