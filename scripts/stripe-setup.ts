/**
 * Creates the products and prices in Stripe TEST mode from src/lib/plans.ts, with lookup keys the
 * app uses (reelay_<plan>_monthly, reelay_<plan>_annual, reelay_topup_<usd>). Idempotent: a lookup key
 * with the right amount is left alone; one whose amount changed in plans.ts gets a new price.
 * Every price is in dollars with a euro amount on the same price (`currency_options.eur`, 26 Oct
 * 2026), both excluding VAT (`tax_behavior: "exclusive"`, Stripe Tax adds VAT on top). A missing or
 * changed euro amount is set on the existing price, so the lookup key and the price id stay. Run with: `node --env-file=.env.local --import tsx scripts/stripe-setup.ts`
 * (or `npx tsx` after installing tsx). Requires STRIPE_SECRET_KEY=rk_test_… (restricted, recommended) or sk_test_…
 * Every product gets STRIPE_PRODUCT_TAX_CODE (needed for Stripe Managed Payments, see billingCheckout.ts).
 */
import Stripe from "stripe";
import { ALL_PLANS as PLANS, BUSINESS_TIERS, TOPUPS, planLabel, stripeAmounts } from "../src/lib/plans";
import { portalConfigurationParams, type PortalKind, type PortalProduct } from "../src/lib/billingPortal";
import { STRIPE_PRODUCT_TAX_CODE, TOPUP_METADATA } from "../src/lib/billingCheckout";
import { WEBHOOK_EVENTS } from "../src/lib/billingEvents";
import { packDescription, planDescription } from "../src/lib/billingProducts";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !/^(sk|rk)_test_/.test(key)) throw new Error("Set STRIPE_SECRET_KEY to a test key (rk_test_… or sk_test_…) first.");
  const stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });

  /** Prices exclude VAT: Stripe Tax adds it on top. */
  const TAX_BEHAVIOR = "exclusive" as const;

  /** `metadata` lands on the product AND the price: the partner platform excludes `commissions_disabled: "yes"` (credit packs). */
  async function ensurePrice(lookup: string, productName: string, amounts: { usd: number; eur: number }, recurring?: { interval: "month" | "year" }, metadata?: Record<string, string>, description?: string) {
    const unitAmount = amounts.usd;
    const currencyOptions = { eur: { unit_amount: amounts.eur, tax_behavior: TAX_BEHAVIOR } };
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1, expand: ["data.currency_options"] });
    const old = existing.data[0];
    // A tax behaviour can be set once (from unspecified), never changed; a price that has the other one is replaced.
    // One product per plan level (26 Oct 2026): a price that sits on a product with another name (the
    // Business levels used to share one product) moves to its own product; the lookup key goes along.
    if (old) {
      const oldProductId = typeof old.product === "string" ? old.product : old.product.id;
      const oldProduct = await stripe.products.retrieve(oldProductId);
      if (oldProduct.name !== productName) {
        const found = await stripe.products.search({ query: `name:'${productName}' AND active:'true'` });
        const product = found.data[0] ?? (await stripe.products.create({ name: productName, tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}), ...(metadata ? { metadata } : {}) }));
        const price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: unitAmount, tax_behavior: TAX_BEHAVIOR, currency_options: currencyOptions, lookup_key: lookup, transfer_lookup_key: true, ...(recurring ? { recurring } : {}), ...(metadata ? { metadata } : {}) });
        await stripe.prices.update(old.id, { active: false });
        return console.log(`~ ${lookup}: moved to its own product "${productName}" (${price.id}; ${old.id} archived)`);
      }
    }
    if (old && old.unit_amount === unitAmount && old.tax_behavior !== "inclusive") {
      if (old.currency_options?.eur?.unit_amount !== amounts.eur || old.currency_options?.eur?.tax_behavior !== TAX_BEHAVIOR || old.tax_behavior !== TAX_BEHAVIOR) {
        await stripe.prices.update(old.id, { tax_behavior: TAX_BEHAVIOR, currency_options: currencyOptions });
        console.log(`~ ${lookup}: euro amount ${amounts.eur} set, excluding VAT (${old.id})`);
      }
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
      // The amount changed in plans.ts (or the old price includes VAT): a new price takes over the lookup key, the old one is archived.
      await stripe.products.update(typeof old.product === "string" ? old.product : old.product.id, { tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}) });
      const price = await stripe.prices.create({ product: typeof old.product === "string" ? old.product : old.product.id, currency: "usd", unit_amount: unitAmount, tax_behavior: TAX_BEHAVIOR, currency_options: currencyOptions, lookup_key: lookup, transfer_lookup_key: true, ...(recurring ? { recurring } : {}), ...(metadata ? { metadata } : {}) });
      await stripe.prices.update(old.id, { active: false });
      return console.log(`~ ${lookup}: ${old.unit_amount} → ${unitAmount} (${price.id}; ${old.id} archived)`);
    }
    const products = await stripe.products.search({ query: `name:'${productName}'` });
    const product = products.data[0] ?? (await stripe.products.create({ name: productName, tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}), ...(metadata ? { metadata } : {}) }));
    if (products.data[0]) await stripe.products.update(product.id, { tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}), ...(metadata ? { metadata } : {}) });
    const price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: unitAmount, tax_behavior: TAX_BEHAVIOR, currency_options: currencyOptions, lookup_key: lookup, ...(recurring ? { recurring } : {}), ...(metadata ? { metadata } : {}) });
    console.log(`+ ${lookup} → ${price.id}`);
  }

  for (const p of PLANS) {
    if (!p.stripeLookup) continue;
    const amounts = stripeAmounts(p);
    await ensurePrice(p.stripeLookup.monthly, `Clipelle ${planLabel(p)}`, amounts.monthly, { interval: "month" }, undefined, planDescription(p));
    await ensurePrice(p.stripeLookup.annual, `Clipelle ${planLabel(p)}`, amounts.annual, { interval: "year" }, undefined, planDescription(p));
  }
  for (const t of TOPUPS) await ensurePrice(t.stripeLookup, `Clipelle credits (${t.credits})`, { usd: Math.round(t.usd * 100), eur: Math.round(t.eur * 100) }, undefined, TOPUP_METADATA, packDescription(t));

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
