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
import { ALL_PLANS as PLANS, BUSINESS_TIERS, CUSTOM_CREDITS, TOPUPS, planLabel, stripeAmounts } from "../src/lib/plans";
import { portalConfigurationParams, type PortalKind, type PortalProduct } from "../src/lib/billingPortal";
import { STRIPE_PRODUCT_TAX_CODE, TOPUP_METADATA } from "../src/lib/billingCheckout";
import { WEBHOOK_EVENTS } from "../src/lib/billingEvents";
import { creditUnitDescription, packDescription, planDescription } from "../src/lib/billingProducts";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !/^(sk|rk)_test_/.test(key)) throw new Error("Set STRIPE_SECRET_KEY to a test key (rk_test_… or sk_test_…) first.");
  const stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });

  /** Prices exclude VAT: Stripe Tax adds it on top. */
  const TAX_BEHAVIOR = "exclusive" as const;

  /**
   * One product per name (26 Oct 2026). Stripe's product search is fuzzy ("Clipelle credits" also
   * finds "Clipelle credits (1000)") and lags behind new products by up to a minute, which once gave
   * every plan two products with the same name (one for the monthly, one for the annual price) and
   * put the per-credit price on a pack's product. So: list every product once, match names exactly,
   * and remember what this run creates.
   */
  const products = new Map<string, Stripe.Product>();
  /** Products this run put a price on; every other "Clipelle …" product without prices is archived. */
  const used = new Set<string>();
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    // Keep the oldest product per name; the newer twin is archived at the end once it has no prices.
    const seen = products.get(product.name);
    if (!seen || product.created < seen.created) products.set(product.name, product);
  }
  async function productFor(name: string, description?: string, metadata?: Record<string, string>) {
    const found = products.get(name);
    if (found) {
      const taxCode = typeof found.tax_code === "string" ? found.tax_code : found.tax_code?.id;
      const metaOff = metadata && Object.entries(metadata).some(([k, v]) => found.metadata?.[k] !== v);
      if (taxCode !== STRIPE_PRODUCT_TAX_CODE || (description && found.description !== description) || metaOff) {
        const updated = await stripe.products.update(found.id, { tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}), ...(metadata ? { metadata } : {}) });
        products.set(name, updated);
        console.log(`~ product "${name}" updated (tax code, description, metadata)`);
        return updated;
      }
      return found;
    }
    const created = await stripe.products.create({ name, tax_code: STRIPE_PRODUCT_TAX_CODE, ...(description ? { description } : {}), ...(metadata ? { metadata } : {}) });
    products.set(name, created);
    console.log(`+ product "${name}" (${created.id})`);
    return created;
  }

  /** `metadata` lands on the product AND the price: the partner platform excludes `commissions_disabled: "yes"` (credit packs). */
  async function ensurePrice(lookup: string, productName: string, amounts: { usd: number; eur: number }, recurring?: { interval: "month" | "year" }, metadata?: Record<string, string>, description?: string) {
    const unitAmount = amounts.usd;
    const currencyOptions = { eur: { unit_amount: amounts.eur, tax_behavior: TAX_BEHAVIOR } };
    const product = await productFor(productName, description, metadata);
    used.add(product.id);
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1, expand: ["data.currency_options"] });
    const old = existing.data[0];
    const create = () => stripe.prices.create({ product: product.id, currency: "usd", unit_amount: unitAmount, tax_behavior: TAX_BEHAVIOR, currency_options: currencyOptions, lookup_key: lookup, transfer_lookup_key: Boolean(old), ...(recurring ? { recurring } : {}), ...(metadata ? { metadata } : {}) });
    if (!old) {
      const price = await create();
      return console.log(`+ ${lookup} → ${price.id}`);
    }
    const oldProduct = typeof old.product === "string" ? old.product : old.product.id;
    // A price sits on the wrong product (a twin with the same name, another pack, an old name): a new
    // price on the right product takes over the lookup key and the old one is archived. Running
    // subscriptions keep their old price until they change plan.
    if (oldProduct !== product.id) {
      const price = await create();
      await stripe.prices.update(old.id, { active: false });
      return console.log(`~ ${lookup}: moved to product "${productName}" (${price.id}; ${old.id} archived)`);
    }
    // The amount changed in plans.ts (or the old price includes VAT): a new price, the old one archived.
    // A tax behaviour can be set once (from unspecified), never changed.
    if (old.unit_amount !== unitAmount || old.tax_behavior === "inclusive") {
      const price = await create();
      await stripe.prices.update(old.id, { active: false });
      return console.log(`~ ${lookup}: ${old.unit_amount} → ${unitAmount} (${price.id}; ${old.id} archived)`);
    }
    if (old.currency_options?.eur?.unit_amount !== amounts.eur || old.currency_options?.eur?.tax_behavior !== TAX_BEHAVIOR || old.tax_behavior !== TAX_BEHAVIOR) {
      await stripe.prices.update(old.id, { tax_behavior: TAX_BEHAVIOR, currency_options: currencyOptions });
      return console.log(`~ ${lookup}: euro amount ${amounts.eur} set, excluding VAT (${old.id})`);
    }
    console.log(`= ${lookup} exists (${old.id})`);
  }

  for (const p of PLANS) {
    if (!p.stripeLookup) continue;
    const amounts = stripeAmounts(p);
    await ensurePrice(p.stripeLookup.monthly, `Clipelle ${planLabel(p)}`, amounts.monthly, { interval: "month" }, undefined, planDescription(p));
    await ensurePrice(p.stripeLookup.annual, `Clipelle ${planLabel(p)}`, amounts.annual, { interval: "year" }, undefined, planDescription(p));
  }
  for (const t of TOPUPS) await ensurePrice(t.stripeLookup, `Clipelle credits (${t.credits})`, { usd: Math.round(t.usd * 100), eur: Math.round(t.eur * 100) }, undefined, TOPUP_METADATA, packDescription(t));
  // Any amount of credits (26 Oct 2026): one price per credit, bought with a quantity; no commission either.
  await ensurePrice(CUSTOM_CREDITS.stripeLookup, "Clipelle credits", { usd: CUSTOM_CREDITS.unitCents, eur: CUSTOM_CREDITS.unitCents }, undefined, TOPUP_METADATA, creditUnitDescription());

  // Archive our products that no longer carry an active price (the twins and old names left behind above).
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (!product.name.startsWith("Clipelle") || used.has(product.id)) continue;
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
    if (prices.data.length === 0) {
      await stripe.products.update(product.id, { active: false });
      console.log(`- product "${product.name}" archived (${product.id}, no active prices)`);
    }
  }

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
