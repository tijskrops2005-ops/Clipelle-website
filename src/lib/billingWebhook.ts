import "server-only";
import type Stripe from "stripe";
import { grantPlanCredits, grantTopupCredits, setPlan, workspaceByCustomer } from "@/lib/billing";
import { PLAN_KEYS } from "@/lib/billing";

/**
 * Applies one verified Stripe event to a WORKSPACE. Pure of HTTP so it can be tested with constructed
 * events. Idempotent: credit grants carry the invoice/session id as reference; plan patches are absolute.
 * Session metadata carries workspaceId and userId (set by src/lib/billingCheckout.ts).
 */
export async function applyStripeEvent(event: Stripe.Event): Promise<{ handled: boolean; note?: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;
      const userId = session.metadata?.userId ?? "";
      if (!workspaceId) return { handled: false, note: "no workspaceId in metadata" };
      if (session.metadata?.kind === "topup" && session.metadata.topupKey) {
        await grantTopupCredits(workspaceId, userId, session.metadata.topupKey, session.id);
        return { handled: true, note: "topup granted" };
      }
      if (session.metadata?.kind === "plan" && typeof session.customer === "string") {
        await setPlan(workspaceId, { stripeCustomerId: session.customer, stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null });
        return { handled: true, note: "customer linked" };
      }
      return { handled: false };
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) return { handled: false, note: "no customer" };
      const ws = await workspaceByCustomer(customerId);
      if (!ws) return { handled: false, note: "unknown customer" };
      const line = invoice.lines?.data?.[0];
      const planKey = (line?.metadata?.planKey as string | undefined) ?? (invoice.parent?.subscription_details?.metadata?.planKey as string | undefined) ?? ws.planKey;
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
      const planKey = (sub.metadata?.planKey as string | undefined) ?? ws.planKey;
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
