import "server-only";
import Stripe from "stripe";

/**
 * Stripe in test mode. Keys come from .env.local only (STRIPE_SECRET_KEY sk_test_…,
 * STRIPE_WEBHOOK_SECRET whsec_…). Without them `stripeEnabled()` is false and Billing shows a
 * disabled state; nothing else breaks. Live keys are refused on purpose until launch.
 */
export function stripeEnabled() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return Boolean(key && key.startsWith("sk_test_"));
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env.local.");
  if (!key.startsWith("sk_test_")) throw new Error("Only a Stripe test key (sk_test_…) is accepted at this stage.");
  if (!client) client = new Stripe(key, { apiVersion: "2026-09-30.clover" as Stripe.LatestApiVersion });
  return client;
}

export function webhookSecret() {
  const s = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!s) throw new Error("STRIPE_WEBHOOK_SECRET is not set in .env.local.");
  return s;
}

/** Looks up a price by its lookup key (set by scripts/stripe-setup.ts). */
export async function priceByLookupKey(lookupKey: string) {
  const list = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  return list.data[0] ?? null;
}
