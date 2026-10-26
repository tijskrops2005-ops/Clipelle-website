/**
 * Stripe Tax settings in TEST mode (26 Oct 2026): the head office from src/content/company.ts,
 * prices excluding VAT by default, our product tax code as the default, and one Dutch VAT
 * registration. Idempotent: run again after a change in company.ts. Run with `npm run stripe:tax`.
 *
 * Registration choice (Tijs, 26 Oct 2026): the Netherlands only, no EU OSS. Type "standard" with
 * the small-seller scheme: Stripe charges Dutch VAT (21%) to consumers in the Netherlands and in
 * other EU countries, which is allowed while EU distance sales stay under €10,000 a year.
 * Businesses with a valid VAT number get reverse charge. Add an OSS registration (type
 * "oss_union") in the Dashboard or here once Clipelle is registered for OSS.
 * Checkout only adds tax with STRIPE_AUTOMATIC_TAX=true (src/lib/billingCheckout.ts).
 */
import Stripe from "stripe";
import { company } from "../src/content/company";
import { STRIPE_PRODUCT_TAX_CODE } from "../src/lib/billingCheckout";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !/^(sk|rk)_test_/.test(key)) throw new Error("Set STRIPE_SECRET_KEY to a test key (rk_test_… or sk_test_…) first.");
  const stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });

  const settings = await stripe.tax.settings.update({
    head_office: { address: { line1: company.street, postal_code: company.postcode, city: company.city, country: "NL" } },
    defaults: { tax_behavior: "exclusive", tax_code: STRIPE_PRODUCT_TAX_CODE },
  });
  console.log(`~ tax settings: head office ${company.street}, ${company.postcode} ${company.city}; prices excluding VAT; status ${settings.status}`);
  if (settings.status !== "active") console.log(`  missing: ${JSON.stringify(settings.status_details)}`);

  const registrations = await stripe.tax.registrations.list({ limit: 100 });
  const nl = registrations.data.find((r) => r.country === "NL" && (r.status === "active" || r.status === "scheduled"));
  if (nl) {
    console.log(`= Dutch VAT registration exists (${nl.id}, ${nl.status}, ${nl.country_options.nl?.type})`);
  } else {
    const created = await stripe.tax.registrations.create({ country: "NL", active_from: "now", country_options: { nl: { type: "standard", standard: { place_of_supply_scheme: "small_seller" } } } });
    console.log(`+ Dutch VAT registration ${created.id} (${created.status}, standard, small seller)`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
