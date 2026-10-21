import { requireUser } from "@/lib/auth";
import { dataErrorResponse } from "@/lib/data/server";
import { getOrCreateProfile } from "@/lib/data/profile";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { databaseModeOnly } from "@/app/api/projects/_guard";

/** Stripe customer portal: change or cancel the plan, update the card, download invoices. */
export async function POST(request: Request) {
  const blocked = databaseModeOnly();
  if (blocked) return blocked;
  try {
    const user = await requireUser();
    if (!stripeEnabled()) return Response.json({ error: "Payments are not configured yet." }, { status: 503 });
    const profile = await getOrCreateProfile(user);
    if (!profile.stripeCustomerId) return Response.json({ error: "No billing account yet. Pick a plan first." }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
    const session = await stripe().billingPortal.sessions.create({ customer: profile.stripeCustomerId, return_url: `${origin}/settings/billing` });
    return Response.json({ url: session.url });
  } catch (error) {
    return dataErrorResponse(error);
  }
}
