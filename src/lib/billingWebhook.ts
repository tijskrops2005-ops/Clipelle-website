import "server-only";
import type Stripe from "stripe";
import { grantPlanCredits, grantTopupCredits, profileByCustomer, setPlan } from "@/lib/billing";
import { PLAN_KEYS } from "@/lib/billing";

/**
 * Applies one verified Stripe event. Pure of HTTP so it can be tested with constructed events.
 * Idempotent: credit grants carry the invoice/session id as reference; plan patches are absolute.
 */
export async function applyStripeEvent(event: Stripe.Event): Promise<{ handled: boolean; note?: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) return { handled: false, note: "no userId in metadata" };
      if (session.metadata?.kind === "topup" && session.metadata.topupKey) {
        await grantTopupCredits(userId, session.metadata.topupKey, session.id);
        return { handled: true, note: "topup granted" };
      }
      if (session.metadata?.kind === "plan" && typeof session.customer === "string") {
        await setPlan(userId, { stripeCustomerId: session.customer, stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null });
        return { handled: true, note: "customer linked" };
      }
      return { handled: false };
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) return { handled: false, note: "no customer" };
      const profile = await profileByCustomer(customerId);
      if (!profile) return { handled: false, note: "unknown customer" };
      const line = invoice.lines?.data?.[0];
      const planKey = (line?.metadata?.planKey as string | undefined) ?? (invoice.parent?.subscription_details?.metadata?.planKey as string | undefined) ?? profile.planKey;
      const periodStart = line?.period?.start ? new Date(line.period.start * 1000) : new Date();
      if (PLAN_KEYS.includes(planKey as (typeof PLAN_KEYS)[number]) && planKey !== "free") {
        await grantPlanCredits(profile.userId, planKey, invoice.id, periodStart);
        await setPlan(profile.userId, { planKey, subscriptionStatus: "active" });
        return { handled: true, note: `plan credits for ${planKey}` };
      }
      return { handled: false, note: "no plan on invoice" };
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const profile = await profileByCustomer(customerId);
      if (!profile) return { handled: false, note: "unknown customer" };
      const planKey = (sub.metadata?.planKey as string | undefined) ?? profile.planKey;
      const periodEnd = sub.items.data[0]?.current_period_end;
      await setPlan(profile.userId, { planKey: sub.status === "active" || sub.status === "trialing" ? planKey : profile.planKey, stripeSubscriptionId: sub.id, subscriptionStatus: sub.status, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null });
      return { handled: true, note: `subscription ${sub.status}` };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const profile = await profileByCustomer(customerId);
      if (!profile) return { handled: false, note: "unknown customer" };
      await setPlan(profile.userId, { planKey: "free", stripeSubscriptionId: null, subscriptionStatus: "canceled", currentPeriodEnd: null });
      return { handled: true, note: "back to free" };
    }
    default:
      return { handled: false, note: `ignored ${event.type}` };
  }
}
