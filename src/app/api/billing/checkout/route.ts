import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
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
    const user = await requireUser();
    if (!stripeEnabled()) return Response.json({ error: "Payments are not configured yet." }, { status: 503 });
    const parsed = Body.safeParse(await readJson(request));
    if (!parsed.success) return Response.json({ error: "Unknown plan or pack." }, { status: 400 });
    const profile = await getOrCreateProfile(user);
    const s = stripe();
    let customerId = profile.stripeCustomerId;
    if (!customerId) {
      const c = await s.customers.create({ email: user.email, metadata: { userId: user.id } });
      customerId = c.id;
      await setPlan(user.id, { stripeCustomerId: customerId });
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
    const b = parsed.data;
    if (b.kind === "plan") {
      const plan = planByKey(b.planKey);
      if (!plan?.stripeLookup) return Response.json({ error: "Unknown plan." }, { status: 400 });
      const price = await priceByLookupKey(b.interval === "annual" ? plan.stripeLookup.annual : plan.stripeLookup.monthly);
      if (!price) return Response.json({ error: "The price is not set up in Stripe yet. Run the setup script." }, { status: 503 });
      const session = await s.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${origin}/settings/billing?checkout=success`,
        cancel_url: `${origin}/settings/billing?checkout=cancelled`,
        subscription_data: { metadata: { userId: user.id, planKey: plan.key } },
        metadata: { userId: user.id, planKey: plan.key, kind: "plan" },
        allow_promotion_codes: true,
      });
      return Response.json({ url: session.url });
    }
    const pack = TOPUPS.find((t) => t.key === b.topupKey);
    if (!pack) return Response.json({ error: "Unknown pack." }, { status: 400 });
    const price = await priceByLookupKey(pack.stripeLookup);
    if (!price) return Response.json({ error: "The price is not set up in Stripe yet. Run the setup script." }, { status: 503 });
    const session = await s.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/settings/billing?checkout=success`,
      cancel_url: `${origin}/settings/billing?checkout=cancelled`,
      metadata: { userId: user.id, topupKey: pack.key, kind: "topup" },
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
