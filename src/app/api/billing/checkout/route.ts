import { z } from "zod";
import { subscriptionSessionParams, topupSessionParams } from "@/lib/billingCheckout";
import { requireOwner } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { getWorkspace } from "@/lib/workspaces";
import { planByKey, TOPUPS } from "@/lib/plans";
import { priceByLookupKey, stripe, stripeEnabled } from "@/lib/stripe";
import { setPlan } from "@/lib/billing";
import { databaseModeOnly, readJson } from "@/app/api/projects/_guard";

const Body = z.union([z.object({ kind: z.literal("plan"), planKey: z.string(), interval: z.enum(["monthly", "annual"]) }), z.object({ kind: z.literal("topup"), topupKey: z.string() })]);

/** Creates a Stripe Checkout session (test mode) for a plan or a credit pack. */
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
    if (!customerId) {
      // One Stripe customer per workspace; the e-mail is the owner's (the partner platform matches on it).
      const c = await s.customers.create({ email: user.email, name: workspace.kind === "team" ? workspace.name : undefined, metadata: { userId: user.id, workspaceId: workspace.id } });
      customerId = c.id;
      await setPlan(workspace.id, { stripeCustomerId: customerId });
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
    const b = parsed.data;
    if (b.kind === "plan") {
      const plan = planByKey(b.planKey);
      if (!plan?.stripeLookup) return Response.json({ error: "Unknown plan." }, { status: 400 });
      if (plan.team && workspace.kind !== "team") return Response.json({ error: "The Business plan is for a team workspace. Create one under Settings → Team first." }, { status: 400 });
      if (!plan.team && workspace.kind === "team") return Response.json({ error: "A team workspace uses the Business plan." }, { status: 400 });
      const price = await priceByLookupKey(b.interval === "annual" ? plan.stripeLookup.annual : plan.stripeLookup.monthly);
      if (!price) return Response.json({ error: "The price is not set up in Stripe yet. Run the setup script." }, { status: 503 });
      const session = await s.checkout.sessions.create(subscriptionSessionParams(plan, { customerId, userId: user.id, workspaceId: workspace.id, priceId: price.id, origin }));
      return Response.json({ url: session.url });
    }
    const pack = TOPUPS.find((t) => t.key === b.topupKey);
    if (!pack) return Response.json({ error: "Unknown pack." }, { status: 400 });
    // The free plan can only run the free combination, so a pack would be money for nothing.
    if (workspace.planKey === "free") return Response.json({ error: "Credit packs come on top of a paid plan. Choose a plan first." }, { status: 400 });
    const price = await priceByLookupKey(pack.stripeLookup);
    if (!price) return Response.json({ error: "The price is not set up in Stripe yet. Run the setup script." }, { status: 503 });
    const session = await s.checkout.sessions.create(topupSessionParams(pack, { customerId, userId: user.id, workspaceId: workspace.id, priceId: price.id, origin }));
    return Response.json({ url: session.url });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
