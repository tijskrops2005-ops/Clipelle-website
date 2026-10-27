import { requireOwner } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getWorkspace } from "@/lib/workspaces";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { planByKey } from "@/lib/plans";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/**
 * "Start my plan now" (27 Oct 2026, Tijs): a customer in the free trial ends it and pays the first
 * period today, so the plan's credits arrive at once instead of after the trial. GET shows what that
 * costs (the subscription's own price, excluding VAT); POST ends the trial in Stripe and charges the
 * saved card straight away. The credits come with the paid invoice through the webhook
 * (`isFullPeriodUpdate`), never from this route, so a failed payment adds nothing.
 */
async function trialingSubscription() {
  const scope = await requireOwner();
  if (!stripeEnabled()) return { error: Response.json({ error: "Payments are not configured yet." }, { status: 503 }) };
  const ws = (await getWorkspace(scope.workspaceId))!;
  if (!ws.stripeSubscriptionId) return { error: Response.json({ error: "No plan yet. Pick a plan first." }, { status: 400 }) };
  const subscription = await stripe().subscriptions.retrieve(ws.stripeSubscriptionId);
  if (subscription.status !== "trialing") return { error: Response.json({ error: "Your plan is already running; there is no trial to end." }, { status: 409 }) };
  return { ws, subscription };
}

export async function GET() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const found = await trialingSubscription();
    if ("error" in found) return found.error;
    const price = found.subscription.items.data[0]?.price;
    const plan = planByKey(found.ws.planKey);
    const annual = price?.recurring?.interval === "year";
    return Response.json({
      amountCents: price?.unit_amount ?? null,
      currency: price?.currency ?? "usd",
      interval: annual ? "annual" : "monthly",
      // What the paid invoice brings: a month of credits, or twelve on an annual price.
      credits: plan ? plan.creditsPerMonth * (annual ? 12 : 1) : null,
      planKey: found.ws.planKey,
    });
  } catch (error) {
    return dataErrorResponse(error);
  }
}

export async function POST() {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const found = await trialingSubscription();
    if ("error" in found) return found.error;
    try {
      // The key changes per minute: a double click charges once, a retry after a new card can still go through.
      await stripe().subscriptions.update(
        found.subscription.id,
        { trial_end: "now", proration_behavior: "none", payment_behavior: "error_if_incomplete" },
        { idempotencyKey: `clipelle-start-now-${found.subscription.id}-${Math.floor(Date.now() / 60_000)}` },
      );
    } catch (error) {
      const type = (error as { type?: string }).type;
      if (type === "StripeCardError") return Response.json({ error: "Your card was declined, so your trial keeps running. Update your card under \"Manage subscription and invoices\" and try again." }, { status: 402 });
      throw error;
    }
    return Response.json({ ok: true });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
