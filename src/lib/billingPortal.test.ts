import { describe, expect, it } from "vitest";
import { portalConfigurationParams } from "./billingPortal";

describe("customer portal configuration", () => {
  const products = [{ product: "prod_pro", prices: ["price_m", "price_y"] }];
  it("cancels at period end, lets customers update card, invoices, address and VAT number", () => {
    const p = portalConfigurationParams("individual", products, "https://www.clipelle.com");
    expect(p.features.subscription_cancel.mode).toBe("at_period_end");
    expect(p.features.invoice_history.enabled).toBe(true);
    expect(p.features.payment_method_update.enabled).toBe(true);
    expect(p.features.customer_update.allowed_updates).toEqual(expect.arrayContaining(["address", "tax_id"]));
    expect(p.business_profile.terms_of_service_url).toBe("https://www.clipelle.com/legal/terms");
    expect(p.default_return_url).toBe("https://www.clipelle.com/settings/billing");
    expect(p.metadata).toEqual({ clipelle_portal: "individual" });
  });
  it("switches plans without a proration invoice and moves downgrades to the period end", () => {
    const p = portalConfigurationParams("team", products, "https://x.test");
    expect(p.features.subscription_update.proration_behavior).toBe("none");
    expect(p.features.subscription_update.schedule_at_period_end.conditions.map((c) => c.type)).toEqual(["decreasing_item_amount", "shortening_interval"]);
    expect(p.features.subscription_update.products).toEqual(products);
    expect(portalConfigurationParams("team", [], "https://x.test").features.subscription_update.enabled).toBe(false);
  });
});
