import { describe, expect, it } from "vitest";
import { PLANS, TOPUPS } from "./plans";
import { CHECKOUT_INTEGRATION_ID, INVOICE_FOOTER, MANAGED_PAYMENTS_UNSUPPORTED, automaticTaxEnabled, managedPaymentsEnabled, REFERRAL_KEYS, STRIPE_PRODUCT_TAX_CODE, subscriptionSessionParams, topupSessionParams, TOPUP_METADATA, withManagedPayments } from "./billingCheckout";

const input = { customerId: "cus_test", userId: "user-1", workspaceId: "ws-1", priceId: "price_test", origin: "https://clipelle.test" };

describe("checkout sessions and the partner program", () => {
  it("a credit pack session carries no referral data and its product is excluded from commissions", () => {
    const params = topupSessionParams(TOPUPS[0], input);
    const flat = JSON.stringify(params).toLowerCase();
    for (const k of REFERRAL_KEYS) expect(flat, k).not.toContain(k.toLowerCase());
    expect(params.mode).toBe("payment");
    expect(params.metadata).toEqual({ userId: "user-1", workspaceId: "ws-1", topupKey: TOPUPS[0].key, kind: "topup" });
    expect(TOPUP_METADATA.commissions_disabled).toBe("yes");
  });

  it("a subscription session is matched on the customer only (e-mail or customer id), with plain metadata", () => {
    const pro = PLANS.find((p) => p.key === "pro")!;
    const params = subscriptionSessionParams(pro, input);
    expect(params.mode).toBe("subscription");
    expect(params.customer).toBe("cus_test");
    expect(params.subscription_data.metadata).toEqual({ userId: "user-1", workspaceId: "ws-1", planKey: "pro" });
    const flat = JSON.stringify(params).toLowerCase();
    for (const k of REFERRAL_KEYS) expect(flat, k).not.toContain(k.toLowerCase());
  });
});

describe("Stripe Managed Payments (merchant of record)", () => {
  const unsupported = (mode: "subscription" | "payment") => MANAGED_PAYMENTS_UNSUPPORTED[mode];
  const has = (obj: Record<string, unknown>, path: string) => {
    const [head, tail] = path.split(".");
    const v = obj[head] as Record<string, unknown> | undefined;
    return tail ? Boolean(v && typeof v === "object" && tail in v) : head in obj;
  };

  it("is off unless STRIPE_MANAGED_PAYMENTS says so", () => {
    expect(managedPaymentsEnabled({})).toBe(false);
    expect(managedPaymentsEnabled({ STRIPE_MANAGED_PAYMENTS: "false" })).toBe(false);
    expect(managedPaymentsEnabled({ STRIPE_MANAGED_PAYMENTS: "true" })).toBe(true);
    expect(managedPaymentsEnabled({ STRIPE_MANAGED_PAYMENTS: " ON " })).toBe(true);
  });

  it("off: the sessions are exactly as before, without managed_payments", () => {
    const pro = PLANS.find((p) => p.key === "pro")!;
    expect(subscriptionSessionParams(pro, input)).not.toHaveProperty("managed_payments");
    expect(topupSessionParams(TOPUPS[0], input)).not.toHaveProperty("managed_payments");
    expect(subscriptionSessionParams(pro, { ...input, managed: false })).toEqual(subscriptionSessionParams(pro, input));
  });

  it("on: a subscription session enables it, sends nothing Stripe manages, and keeps the metadata", () => {
    const pro = PLANS.find((p) => p.key === "pro")!;
    const params = subscriptionSessionParams(pro, { ...input, managed: true });
    expect(params.managed_payments).toEqual({ enabled: true });
    for (const path of unsupported("subscription")) expect(has(params as Record<string, unknown>, path), path).toBe(false);
    expect(params.metadata).toEqual({ userId: "user-1", workspaceId: "ws-1", planKey: "pro", kind: "plan" });
    expect(params.subscription_data.metadata).toEqual({ userId: "user-1", workspaceId: "ws-1", planKey: "pro" });
    expect(params.customer).toBe("cus_test");
    expect(params.allow_promotion_codes).toBe(true);
  });

  it("on: a credit pack session enables it, keeps its metadata and still carries no referral data", () => {
    const params = topupSessionParams(TOPUPS[0], { ...input, managed: true });
    expect(params.managed_payments).toEqual({ enabled: true });
    for (const path of unsupported("payment")) expect(has(params as Record<string, unknown>, path), path).toBe(false);
    expect(params.metadata).toEqual({ userId: "user-1", workspaceId: "ws-1", topupKey: TOPUPS[0].key, kind: "topup" });
    const flat = JSON.stringify(params).toLowerCase();
    for (const k of REFERRAL_KEYS) expect(flat, k).not.toContain(k.toLowerCase());
  });

  it("drops parameters Stripe manages if they ever appear, nested ones too, and keeps the rest", () => {
    const base = { mode: "subscription" as const, automatic_tax: { enabled: true }, payment_method_types: ["card"], subscription_data: { metadata: { a: "1" }, invoice_settings: { issuer: { type: "self" } }, default_tax_rates: ["txr_1"] }, metadata: { b: "2" } };
    const out = withManagedPayments(base, true) as Record<string, unknown>;
    expect(out).not.toHaveProperty("automatic_tax");
    expect(out).not.toHaveProperty("payment_method_types");
    expect(out.subscription_data).toEqual({ metadata: { a: "1" } });
    expect(out.metadata).toEqual({ b: "2" });
    expect(base.subscription_data).toHaveProperty("invoice_settings"); // the input is not changed
  });

  it("every product gets a tax code that Managed Payments accepts", () => {
    // A few of the eligible codes from docs.stripe.com/payments/managed-payments/eligibility (26 Oct 2026).
    const eligible = ["txcd_10000000", "txcd_10103001", "txcd_10105001", "txcd_10105002"];
    expect(eligible).toContain(STRIPE_PRODUCT_TAX_CODE);
  });
});

describe("checkout session hygiene (Stripe best practices)", () => {
  it("tags both sessions with one integration identifier and never pins payment methods", () => {
    const pro = PLANS.find((p) => p.key === "pro")!;
    for (const params of [subscriptionSessionParams(pro, input), topupSessionParams(TOPUPS[0], input), subscriptionSessionParams(pro, { ...input, managed: true })]) {
      expect(params.integration_identifier).toBe(CHECKOUT_INTEGRATION_ID);
      expect(params).not.toHaveProperty("payment_method_types");
    }
    expect(CHECKOUT_INTEGRATION_ID).toMatch(/_[a-z]{8}$/);
  });
});

describe("tax and invoices", () => {
  const pro = PLANS.find((p) => p.key === "pro")!;
  it("a credit pack gets a real invoice with our company details (KvK, VAT)", () => {
    const params = topupSessionParams(TOPUPS[0], input);
    expect(params.invoice_creation?.enabled).toBe(true);
    expect(params.invoice_creation?.invoice_data.footer).toBe(INVOICE_FOOTER);
    expect(INVOICE_FOOTER).toMatch(/KvK|Chamber of Commerce/);
    expect(INVOICE_FOOTER).toMatch(/VAT/);
  });
  it("Stripe Tax is off by default and, when on, collects address and VAT numbers", () => {
    expect(automaticTaxEnabled({})).toBe(false);
    expect(subscriptionSessionParams(pro, input)).not.toHaveProperty("automatic_tax");
    const taxed = subscriptionSessionParams(pro, { ...input, automaticTax: true });
    expect(taxed.automatic_tax).toEqual({ enabled: true });
    expect(taxed.tax_id_collection).toEqual({ enabled: true });
    expect(taxed.customer_update).toEqual({ address: "auto", name: "auto" });
  });
  it("Managed Payments takes over tax and invoices: none of it is sent then", () => {
    const sub = subscriptionSessionParams(pro, { ...input, automaticTax: true, managed: true });
    const pack = topupSessionParams(TOPUPS[0], { ...input, automaticTax: true, managed: true });
    for (const p of [sub, pack]) {
      expect(p).not.toHaveProperty("automatic_tax");
      expect(p).not.toHaveProperty("tax_id_collection");
      expect(p).not.toHaveProperty("customer_update");
      expect(p.managed_payments).toEqual({ enabled: true });
    }
    expect(pack).not.toHaveProperty("invoice_creation");
  });
});
