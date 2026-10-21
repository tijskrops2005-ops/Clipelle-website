import { eq } from "drizzle-orm";
import { db, webhookEvents } from "@/lib/db";
import { stripe, stripeEnabled, webhookSecret } from "@/lib/stripe";
import { applyStripeEvent } from "@/lib/billingWebhook";

/**
 * Stripe webhook: verifies the signature, stores the event once (unique on provider+id+type),
 * then applies it. A replay of the same event is acknowledged without side effects.
 */
export async function POST(request: Request) {
  if (!stripeEnabled()) return new Response("Payments not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const raw = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  const inserted = await db()
    .insert(webhookEvents)
    .values({ provider: "stripe", externalId: event.id, eventType: event.type, payload: event as unknown as Record<string, unknown> })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) return Response.json({ received: true, duplicate: true });
  try {
    const result = await applyStripeEvent(event);
    await db().update(webhookEvents).set({ processedAt: new Date() }).where(eq(webhookEvents.id, inserted[0].id));
    return Response.json({ received: true, ...result });
  } catch (error) {
    // Leave processedAt empty so the event can be retried by Stripe; the row stays for inspection.
    return new Response(error instanceof Error ? error.message : "Failed", { status: 500 });
  }
}
