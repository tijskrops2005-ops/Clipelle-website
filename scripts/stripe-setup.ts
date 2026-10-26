/**
 * Creates the products and prices in Stripe TEST mode from src/lib/plans.ts, with lookup keys the
 * app uses (reelay_<plan>_monthly, reelay_<plan>_annual, reelay_topup_<usd>). Idempotent: a lookup key
 * with the right amount is left alone; one whose amount changed in plans.ts gets a new price. Run with: `node --env-file=.env.local --import tsx scripts/stripe-setup.ts`
 * (or `npx tsx` after installing tsx). Requires STRIPE_SECRET_KEY=rk_test_… (restricted, recommended) or sk_test_…
 * Every product gets STRIPE_PRODUCT_TAX_CODE (needed for Stripe Managed Payments, see billingCheckout.ts).
 */
import Stripe from "stripe";
import { ALL_PLANS as PLANS, BUSINESS_TIERS, TOPUPS } from "../src/lib/plans";
import { portalConfigurationParams, type PortalKind, type PortalProduct } from "../src/lib/billingPortal";
import { STRIPE_PRODUCT_TAX_CODE, TOPUP_METADATA } from "../src/lib/billingCheckout";
import { WEBHOOK_EVENTS } from "../src/lib/billingEvents";
import { packDescription, planDescription } from "../src/lib/billingProducts";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !/^(sk|rk)_test_/.test(key)) throw new Error("Set STRIPE_SECRET_KEY to a test key (rk_test_… or sk_test_…) first.");
  const stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });

  /** `metadata` lands on the product AND the price: the partner platform excludes `commissions_disabled: "yes"` (credit packs). */
  async function ensurePrice(lookup: string, productName: string, unitAmount: number, recurring?: { interval: "month" | "year" }, metadata?: Record<string, string>, description?: string) {
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
    const old = existing.data[0];
    if (old && old.unit_amount === unitAmount) {
      // Same amount: keep the price, but keep the product name current (a pack's name carries its credits).
      const productId = typeof old.product === "string" ? old.product : old.product.id;
      const product = await stripe.products.retrieve(productId);
      // Every product carries the tax code Managed Payments needs (26 Oct 2026); harmless without it.
      const productTaxCode = typeof product.tax_code === "string" ? product.tax_code : product.tax_code?.id;
      // The description is the line under the product on the Checkout page.
      if (product.name !== productName || productTaxCode !== STRIPE_PRODUCT_TAX_CODE || (description && product.description !== description)) {
        await stripe.products.update(productId, { name: productName, tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}) });
        return console.log(`~ ${lookup}: product "${productName}" updated (tax code, description)`);
      }
      return console.log(`= ${lookup} exists (${old.id})`);
    }
    if (old) {
      // The amount changed in plans.ts: a new price takes over the lookup key, the old one is archived.
      await stripe.products.update(typeof old.product === "string" ? old.product : old.product.id, { tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}) });
      const price = await stripe.prices.create({ product: typeof old.product === "string" ? old.product : old.product.id, currency: "usd", unit_amount: unitAmount, lookup_key: lookup, transfer_lookup_key: true, ...(recurring ? { recurring } : {}), ...(metadata ? { metadata } : {}) });
      await stripe.prices.update(old.id, { active: false });
      return console.log(`~ ${lookup}: ${old.unit_amount} → ${unitAmount} (${price.id}; ${old.id} archived)`);
    }
    const products = await stripe.products.search({ query: `name:'${productName}'` });
    const product = products.data[0] ?? (await stripe.products.create({ name: productName, tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}), ...(metadata ? { metadata } : {}) }));
    if (products.data[0]) await stripe.products.update(product.id, { tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}), ...(metadata ? { metadata } : {}) });
    const price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: unitAmount, lookup_key: lookup, ...(recurring ? { recurring } : {}), ...(metadata ? { metadata } : {}) });
    console.log(`+ ${lookup} → ${price.id}`);
  }

  for (const p of PLANS) {
    if (!p.stripeLookup) continue;
    await ensurePrice(p.stripeLookup.monthly, `Clipelle ${p.name}`, Math.round(p.monthlyUsd * 100), { interval: "month" }, undefined, planDescription(p));
    await ensurePrice(p.stripeLookup.annual, `Clipelle ${p.name}`, Math.round(p.annualMonthlyUsd * 12 * 100), { interval: "year" }, undefined, planDescription(p));
  }
  for (const t of TOPUPS) await ensurePrice(t.stripeLookup, `Clipelle credits (${t.credits})`, Math.round(t.usd * 100), undefined, TOPUP_METADATA, packDescription(t));

  // Customer portal: one configuration for personal plans, one for team (Business) plans.
  async function portalProducts(keys: string[]): Promise<PortalProduct[]> {
    const byProduct = new Map<string, string[]>();
    for (const p of PLANS.filter((x) => keys.includes(x.key) && x.stripeLookup)) {
      const prices = await stripe.prices.list({ lookup_keys: [p.stripeLookup!.monthly, p.stripeLookup!.annual], active: true, limit: 10 });
      for (const price of prices.data) {
        const product = typeof price.product === "string" ? price.product : price.product.id;
        byProduct.set(product, [...(byProduct.get(product) ?? []), price.id]);
      }
    }
    return [...byProduct].map(([product, prices]) => ({ product, prices }));
  }
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const teamKeys = BUSINESS_TIERS.map((b) => b.key);
  for (const kind of ["individual", "team"] as PortalKind[]) {
    const keys = PLANS.filter((p) => p.stripeLookup && (kind === "team" ? teamKeys.includes(p.key) : !teamKeys.includes(p.key))).map((p) => p.key);
    const params = portalConfigurationParams(kind, await portalProducts(keys));
    const found = existing.data.find((c) => c.metadata?.clipelle_portal === kind);
    if (found) {
      await stripe.billingPortal.configurations.update(found.id, params);
      console.log(`~ portal configuration (${kind}) updated: ${found.id}`);
    } else {
      const created = await stripe.billingPortal.configurations.create(params);
      console.log(`+ portal configuration (${kind}): ${created.id}`);
    }
  }
  console.log(`Done. Add the webhook endpoint /api/billing/webhook for: ${WEBHOOK_EVENTS.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
