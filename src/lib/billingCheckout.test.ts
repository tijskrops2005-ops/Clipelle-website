import { describe, expect, it } from "vitest";
import { PLANS, TOPUPS } from "./plans";
import { REFERRAL_KEYS, subscriptionSessionParams, topupSessionParams, TOPUP_METADATA } from "./billingCheckout";

const input = { customerId: "cus_test", userId: "user-1", workspaceId: "ws-1", priceId: "price_test", origin: "https://reelay.test" };

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
