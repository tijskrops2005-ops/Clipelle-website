/**
 * Creates the products and prices in Stripe TEST mode from src/lib/plans.ts, with lookup keys the
 * app uses (reelay_<plan>_monthly, reelay_<plan>_annual, reelay_topup_<usd>). Idempotent: a lookup key
 * with the right amount is left alone; one whose amount changed in plans.ts gets a new price. Run with: `node --env-file=.env.local --import tsx scripts/stripe-setup.ts`
 * (or `npx tsx` after installing tsx). Requires STRIPE_SECRET_KEY=sk_test_…
 * Every product gets STRIPE_PRODUCT_TAX_CODE (needed for Stripe Managed Payments, see billingCheckout.ts).
 */
import Stripe from "stripe";
import { ALL_PLANS as PLANS, TOPUPS } from "../src/lib/plans";
import { STRIPE_PRODUCT_TAX_CODE, TOPUP_METADATA } from "../src/lib/billingCheckout";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !key.startsWith("sk_test_")) throw new Error("Set STRIPE_SECRET_KEY to a test key (sk_test_…) first.");
  const stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });

  /** `metadata` lands on the product AND the price: the partner platform excludes `commissions_disabled: "yes"` (credit packs). */
  async function ensurePrice(lookup: string, productName: string, unitAmount: number, recurring?: { interval: "month" | "year" }, metadata?: Record<string, string>) {
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
    const old = existing.data[0];
    if (old && old.unit_amount === unitAmount) {
      // Same amount: keep the price, but keep the product name current (a pack's name carries its credits).
      const productId = typeof old.product === "string" ? old.product : old.product.id;
      const product = await stripe.products.retrieve(productId);
      // Every product carries the tax code Managed Payments needs (26 Oct 2026); harmless without it.
      const productTaxCode = typeof product.tax_code === "string" ? product.tax_code : product.tax_code?.id;
      if (product.name !== productName || productTaxCode !== STRIPE_PRODUCT_TAX_CODE) {
        await stripe.products.update(productId, { name: productName, tax_code: STRIPE_PRODUCT_TAX_CODE });
        return console.log(`~ ${lookup}: product "${productName}", tax code ${STRIPE_PRODUCT_TAX_CODE}`);
      }
      return console.log(`= ${lookup} exists (${old.id})`);
    }
    if (old) {
      // The amount changed in plans.ts: a new price takes over the lookup key, the old one is archived.
      await stripe.products.update(typeof old.product === "string" ? old.product : old.product.id, { tax_code: STRIPE_PRODUCT_TAX_CODE });
      const price = await stripe.prices.create({ product: typeof old.product === "string" ? old.product : old.product.id, currency: "usd", unit_amount: unitAmount, lookup_key: lookup, transfer_lookup_key: true, ...(recurring ? { recurring } : {}), ...(metadata ? { metadata } : {}) });
      await stripe.prices.update(old.id, { active: false });
      return console.log(`~ ${lookup}: ${old.unit_amount} → ${unitAmount} (${price.id}; ${old.id} archived)`);
    }
    const products = await stripe.products.search({ query: `name:'${productName}'` });
    const product = products.data[0] ?? (await stripe.products.create({ name: productName, tax_code: STRIPE_PRODUCT_TAX_CODE, ...(metadata ? { metadata } : {}) }));
    if (products.data[0]) await stripe.products.update(product.id, { tax_code: STRIPE_PRODUCT_TAX_CODE, ...(metadata ? { metadata } : {}) });
    const price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: unitAmount, lookup_key: lookup, ...(recurring ? { recurring } : {}), ...(metadata ? { metadata } : {}) });
    console.log(`+ ${lookup} → ${price.id}`);
  }

  for (const p of PLANS) {
    if (!p.stripeLookup) continue;
    await ensurePrice(p.stripeLookup.monthly, `Clipelle ${p.name}`, Math.round(p.monthlyUsd * 100), { interval: "month" });
    await ensurePrice(p.stripeLookup.annual, `Clipelle ${p.name}`, Math.round(p.annualMonthlyUsd * 12 * 100), { interval: "year" });
  }
  for (const t of TOPUPS) await ensurePrice(t.stripeLookup, `Clipelle credits (${t.credits})`, Math.round(t.usd * 100), undefined, TOPUP_METADATA);
  console.log("Done. Add the webhook endpoint /api/billing/webhook for: checkout.session.completed, invoice.paid, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
