/**
 * Creates the products and prices in Stripe TEST mode from src/lib/plans.ts, with lookup keys the
 * app uses (reelay_<plan>_monthly, reelay_<plan>_annual, reelay_topup_<usd>). Idempotent: existing
 * lookup keys are left alone. Run with: `node --env-file=.env.local --import tsx scripts/stripe-setup.ts`
 * (or `npx tsx` after installing tsx). Requires STRIPE_SECRET_KEY=sk_test_…
 */
import Stripe from "stripe";
import { PLANS, TOPUPS } from "../src/lib/plans";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !key.startsWith("sk_test_")) throw new Error("Set STRIPE_SECRET_KEY to a test key (sk_test_…) first.");
  const stripe = new Stripe(key, { apiVersion: "2026-09-30.clover" as Stripe.LatestApiVersion });

  async function ensurePrice(lookup: string, productName: string, unitAmount: number, recurring?: { interval: "month" | "year" }) {
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
    if (existing.data[0]) return console.log(`= ${lookup} exists (${existing.data[0].id})`);
    const products = await stripe.products.search({ query: `name:'${productName}'` });
    const product = products.data[0] ?? (await stripe.products.create({ name: productName }));
    const price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: unitAmount, lookup_key: lookup, ...(recurring ? { recurring } : {}) });
    console.log(`+ ${lookup} → ${price.id}`);
  }

  for (const p of PLANS) {
    if (!p.stripeLookup) continue;
    await ensurePrice(p.stripeLookup.monthly, `Reelay ${p.name}`, Math.round(p.monthlyUsd * 100), { interval: "month" });
    await ensurePrice(p.stripeLookup.annual, `Reelay ${p.name}`, Math.round(p.annualMonthlyUsd * 12 * 100), { interval: "year" });
  }
  for (const t of TOPUPS) await ensurePrice(t.stripeLookup, `Reelay credits (${t.credits})`, Math.round(t.usd * 100));
  console.log("Done. Add the webhook endpoint /api/billing/webhook for: checkout.session.completed, invoice.paid, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
