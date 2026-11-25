import "server-only";
import Stripe from "stripe";

/**
 * Stripe. Keys come from the environment only (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET whsec_…).
 * Without them `stripeEnabled()` is false and Billing shows a disabled state; nothing else breaks.
 * Test keys (rk_test_… recommended, sk_test_…) always work. A live key (rk_live_… / sk_live_…) works
 * only with STRIPE_LIVE=on (25 Nov 2026, going live), so a live key never takes real payments by accident.
 */
export function isTestKey(key: string | undefined) {
  return Boolean(key && /^(sk|rk)_test_/.test(key.trim()));
}

export function isLiveKey(key: string | undefined) {
  return Boolean(key && /^(sk|rk)_live_/.test(key.trim()));
}

/** A key the app may use: any test key, or a live key with STRIPE_LIVE=on. */
export function stripeKeyAllowed(key: string | undefined, liveSwitch = process.env.STRIPE_LIVE) {
  return isTestKey(key) || (isLiveKey(key) && liveSwitch?.trim().toLowerCase() === "on");
}

export function stripeEnabled() {
  return stripeKeyAllowed(process.env.STRIPE_SECRET_KEY);
}

/** True when the app takes real payments. */
export function stripeLive() {
  return isLiveKey(process.env.STRIPE_SECRET_KEY) && stripeEnabled();
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  if (!stripeKeyAllowed(key)) throw new Error(isLiveKey(key) ? "STRIPE_SECRET_KEY is a live key: set STRIPE_LIVE=on to take real payments." : "STRIPE_SECRET_KEY is not a Stripe secret or restricted key.");
  // The SDK's own pinned version (stripe 23.x: 2026-09-30.endive), which includes managed_payments on
  // Checkout Sessions (added in 2026-04-22.dahlia). The old string here mixed a date and a release name.
  if (!client) client = new Stripe(key, { apiVersion: Stripe.API_VERSION });
  return client;
}

export function webhookSecret() {
  const s = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!s) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  return s;
}

/** Looks up a price by its lookup key (set by scripts/stripe-setup.ts). */
export async function priceByLookupKey(lookupKey: string) {
  const list = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  return list.data[0] ?? null;
}
