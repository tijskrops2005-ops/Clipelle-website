import { requireOwner } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getWorkspace } from "@/lib/workspaces";
import { z } from "zod";
import { priceByLookupKey, stripe, stripeEnabled } from "@/lib/stripe";
import { planByKey } from "@/lib/plans";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";
import { planChangeFlow, type PortalKind } from "@/lib/billingPortal";

/** Optional: open the portal on the confirm screen for this plan (a plan or level change). */
const Body = z.object({ planKey: z.string(), interval: z.enum(["monthly", "annual"]) }).partial();

/** The portal configuration made by scripts/stripe-setup.ts for this kind of workspace, cached per process. */
const configCache = new Map<PortalKind, string | null>();
async function portalConfiguration(kind: PortalKind) {
  if (configCache.has(kind)) return configCache.get(kind) ?? undefined;
  const list = await stripe().billingPortal.configurations.list({ active: true, limit: 100 });
  const id = list.data.find((c) => c.metadata?.clipelle_portal === kind)?.id ?? null;
  configCache.set(kind, id);
  return id ?? undefined; // none yet: Stripe's default configuration from the Dashboard
}

/**
 * Stripe customer portal: change or cancel the plan, update the card, download invoices; the configuration fits the workspace kind.
 * With `{ planKey, interval }` it opens straight on the confirm screen for that plan or level (26 Oct 2026).
 */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const scope = await requireOwner();
    if (!stripeEnabled()) return Response.json({ error: "Payments are not configured yet." }, { status: 503 });
    const profile = (await getWorkspace(scope.workspaceId))!;
    if (!profile.stripeCustomerId) return Response.json({ error: "No billing account yet. Pick a plan first." }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
    const configuration = await portalConfiguration(profile.kind === "team" ? "team" : "individual");
    const body = Body.safeParse((await readJson(request)) ?? {});
    const wanted = body.success && body.data.planKey && body.data.interval ? { plan: planByKey(body.data.planKey), interval: body.data.interval } : null;
    let flow_data: ReturnType<typeof planChangeFlow> | undefined;
    if (wanted) {
      const plan = wanted.plan;
      if (!plan?.stripeLookup) return Response.json({ error: "Unknown plan." }, { status: 400 });
      if (Boolean(plan.team) !== (profile.kind === "team")) return Response.json({ error: profile.kind === "team" ? "A team workspace uses the Business plan." : "The Business plan is for a team workspace. Create one under Settings → Team first." }, { status: 400 });
      if (!profile.stripeSubscriptionId) return Response.json({ error: "No plan to change yet. Pick a plan first." }, { status: 400 });
      const price = await priceByLookupKey(wanted.interval === "annual" ? plan.stripeLookup.annual : plan.stripeLookup.monthly);
      if (!price) return Response.json({ error: "The price is not set up in Stripe yet. Run the setup script." }, { status: 503 });
      const subscription = await stripe().subscriptions.retrieve(profile.stripeSubscriptionId);
      const item = subscription.items.data[0];
      if (!item) return Response.json({ error: "Your subscription could not be read. Open the portal from Billing." }, { status: 409 });
      if (item.price.id === price.id) return Response.json({ error: "You are already on this plan." }, { status: 409 });
      flow_data = planChangeFlow({ subscriptionId: subscription.id, itemId: item.id, priceId: price.id, returnUrl: `${origin}/settings/billing?checkout=changed` });
    }
    const session = await stripe().billingPortal.sessions.create({ customer: profile.stripeCustomerId, return_url: `${origin}/settings/billing`, ...(configuration ? { configuration } : {}), ...(flow_data ? { flow_data } : {}) });
    return Response.json({ url: session.url });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
