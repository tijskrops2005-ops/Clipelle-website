import { z } from "zod";
import { INVOICE_FOOTER, automaticTaxEnabled, checkoutCurrency, creditsSessionParams, managedPaymentsEnabled, termsConsentEnabled, subscriptionSessionParams, topupSessionParams } from "@/lib/billingCheckout";
import { requireOwner } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getWorkspace } from "@/lib/workspaces";
import { CUSTOM_CREDITS, planByKey, TOPUPS, validCustomCredits } from "@/lib/plans";
import { priceByLookupKey, stripe, stripeEnabled } from "@/lib/stripe";
import { setPlan, trialAvailable } from "@/lib/billing";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

const Currency = z.enum(["usd", "eur"]).optional();
const Body = z.union([z.object({ kind: z.literal("plan"), planKey: z.string(), interval: z.enum(["monthly", "annual"]), currency: Currency }), z.object({ kind: z.literal("topup"), topupKey: z.string(), currency: Currency }), z.object({ kind: z.literal("credits"), credits: z.number(), currency: Currency })]);

/** Creates a Stripe Checkout session (test mode) for a plan, a credit pack or any amount of credits; with Managed Payments when switched on. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireOwner();
    const user = scope.user;
    if (!stripeEnabled()) return Response.json({ error: "Payments are not configured yet." }, { status: 503 });
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Unknown plan or pack." }, { status: 400 });
    await getOrCreateProfile(user);
    const workspace = (await getWorkspace(scope.workspaceId))!;
    const s = stripe();
    let customerId = workspace.stripeCustomerId;
    let customerCurrency: string | null = null;
    if (customerId) {
      const existing = await s.customers.retrieve(customerId);
      customerCurrency = existing.deleted ? null : (existing.currency ?? null);
    } else {
      // One Stripe customer per workspace; the e-mail is the owner's (the partner platform matches on it).
      // Idempotency key per workspace: two quick clicks (or a retry) give one customer, not two.
      // The invoice footer carries our company details on every invoice of this customer (subscriptions too).
      const c = await s.customers.create({ email: user.email, name: workspace.kind === "team" ? workspace.name : undefined, metadata: { userId: user.id, workspaceId: workspace.id }, invoice_settings: { footer: INVOICE_FOOTER } }, { idempotencyKey: `clipelle-customer-${workspace.id}` });
      customerId = c.id;
      await setPlan(workspace.id, { stripeCustomerId: customerId });
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
    // Stripe as merchant of record when STRIPE_MANAGED_PAYMENTS is on (default off).
    const managed = managedPaymentsEnabled();
    // Stripe Tax only for our own sales; with Managed Payments Stripe handles tax itself.
    const automaticTax = !managed && automaticTaxEnabled();
    const requireTerms = termsConsentEnabled();
    const b = parsed.data;
    // Dollars or euros: the same Stripe price carries both amounts (currency_options.eur).
    const currency = checkoutCurrency(b.currency, customerCurrency);
    if (b.kind === "plan") {
      const plan = planByKey(b.planKey);
      if (!plan?.stripeLookup) return Response.json({ error: "Unknown plan." }, { status: 400 });
      if (plan.team && workspace.kind !== "team") return Response.json({ error: "The Business plan is for a team workspace. Create one under Settings → Team first." }, { status: 400 });
      if (!plan.team && workspace.kind === "team") return Response.json({ error: "A team workspace uses the Business plan." }, { status: 400 });
      // One subscription per workspace: a plan change for a current subscriber goes through the portal.
      if (workspace.stripeSubscriptionId && ["active", "trialing", "past_due", "canceling"].includes(workspace.subscriptionStatus ?? "")) {
        return Response.json({ error: "You already have a plan. Change it in the billing portal.", code: "has_subscription" }, { status: 409 });
      }
      const price = await priceByLookupKey(b.interval === "annual" ? plan.stripeLookup.annual : plan.stripeLookup.monthly);
      if (!price) return Response.json({ error: "The price is not set up in Stripe yet. Run the setup script." }, { status: 503 });
      // The free trial, once per workspace (26 Oct 2026).
      const trial = trialAvailable(workspace);
      const session = await s.checkout.sessions.create(subscriptionSessionParams(plan, { customerId, userId: user.id, workspaceId: workspace.id, priceId: price.id, origin, managed, automaticTax, requireTerms, currency, trial }));
      return Response.json({ url: session.url });
    }
    // The free plan can only run the free combination, so credits would be money for nothing.
    if (workspace.planKey === "free") return Response.json({ error: "Credit packs come on top of a paid plan. Choose a plan first." }, { status: 400 });
    if (b.kind === "credits") {
      // Any amount (26 Oct 2026): the per-credit price with a quantity.
      if (!validCustomCredits(b.credits)) return Response.json({ error: `Pick between ${CUSTOM_CREDITS.min} and ${CUSTOM_CREDITS.max.toLocaleString("en-US")} credits, in steps of ${CUSTOM_CREDITS.step}.` }, { status: 400 });
      const unit = await priceByLookupKey(CUSTOM_CREDITS.stripeLookup);
      if (!unit) return Response.json({ error: "The price is not set up in Stripe yet. Run the setup script." }, { status: 503 });
      const session = await s.checkout.sessions.create(creditsSessionParams(b.credits, { customerId, userId: user.id, workspaceId: workspace.id, priceId: unit.id, origin, managed, automaticTax, requireTerms, currency }));
      return Response.json({ url: session.url });
    }
    const pack = TOPUPS.find((t) => t.key === b.topupKey);
    if (!pack) return Response.json({ error: "Unknown pack." }, { status: 400 });
    const price = await priceByLookupKey(pack.stripeLookup);
    if (!price) return Response.json({ error: "The price is not set up in Stripe yet. Run the setup script." }, { status: 503 });
    const session = await s.checkout.sessions.create(topupSessionParams(pack, { customerId, userId: user.id, workspaceId: workspace.id, priceId: price.id, origin, managed, automaticTax, requireTerms, currency }));
    return Response.json({ url: session.url });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
