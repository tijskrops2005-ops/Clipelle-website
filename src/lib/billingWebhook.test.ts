import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The Stripe event applier with constructed events (no HTTP, no Stripe account). Needs the
 * database for the ledger; skipped without DATABASE_URL. Checks idempotency on a replay.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const userId = "00000000-0000-0000-0000-00000000000c";
let wsId = "";

describe.skipIf(!hasDb)("stripe webhook applier", () => {
  beforeAll(async () => {
    const { db, profiles } = await import("@/lib/db");
    await db().insert(profiles).values({ userId, email: "webhook-test@clipelle.local" }).onConflictDoNothing();
    const { ensurePersonalWorkspace } = await import("./workspaces");
    wsId = (await ensurePersonalWorkspace({ id: userId, email: "webhook-test@clipelle.local" })).id;
  });
  afterAll(async () => {
    const { db, creditLedger, profiles, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().delete(creditLedger).where(eq(creditLedger.workspaceId, wsId));
    await db().delete(workspaces).where(eq(workspaces.ownerUserId, userId));
    await db().delete(profiles).where(eq(profiles.userId, userId));
  });

  it("grants a credit pack once for the same checkout session", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { getCreditBalance } = await import("./credits");
    const { TOPUPS } = await import("./plans");
    const event = { id: "evt_test_1", type: "checkout.session.completed", data: { object: { id: "cs_test_123", metadata: { userId, workspaceId: wsId, kind: "topup", topupKey: TOPUPS[0].key }, customer: "cus_test" } } } as unknown as import("stripe").Stripe.Event;
    const first = await applyStripeEvent(event);
    expect(first.handled).toBe(true);
    expect(await getCreditBalance(wsId)).toBe(TOPUPS[0].credits);
    await applyStripeEvent(event); // replay
    expect(await getCreditBalance(wsId)).toBe(TOPUPS[0].credits);
  });

  it("waits for a delayed payment: no credits while unpaid, once when the async payment succeeds", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { getCreditBalance } = await import("./credits");
    const { TOPUPS } = await import("./plans");
    const before = await getCreditBalance(wsId);
    const session = { id: "cs_test_async", payment_status: "unpaid", metadata: { userId, workspaceId: wsId, kind: "topup", topupKey: TOPUPS[1].key }, customer: "cus_test" };
    const completed = { id: "evt_test_async_1", type: "checkout.session.completed", data: { object: session } } as unknown as import("stripe").Stripe.Event;
    expect((await applyStripeEvent(completed)).note).toMatch(/waits/);
    expect(await getCreditBalance(wsId)).toBe(before);
    const succeeded = { id: "evt_test_async_2", type: "checkout.session.async_payment_succeeded", data: { object: { ...session, payment_status: "paid" } } } as unknown as import("stripe").Stripe.Event;
    expect((await applyStripeEvent(succeeded)).handled).toBe(true);
    expect(await applyStripeEvent(succeeded)).toMatchObject({ handled: true }); // replay
    expect(await getCreditBalance(wsId)).toBe(before + TOPUPS[1].credits);
    const failed = { id: "evt_test_async_3", type: "checkout.session.async_payment_failed", data: { object: { ...session, id: "cs_test_async_failed" } } } as unknown as import("stripe").Stripe.Event;
    expect((await applyStripeEvent(failed)).note).toMatch(/nothing granted/);
    expect(await getCreditBalance(wsId)).toBe(before + TOPUPS[1].credits);
  });

  it("takes the plan from the price, so a plan changed in the portal is recognised", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { db, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().update(workspaces).set({ stripeCustomerId: "cus_test_plan", planKey: "starter" }).where(eq(workspaces.id, wsId));
    // The subscription still carries the metadata of the first plan; the price says Pro.
    const updated = { id: "evt_test_plan_1", type: "customer.subscription.updated", data: { object: { id: "sub_plan", customer: "cus_test_plan", status: "active", metadata: { planKey: "starter" }, items: { data: [{ current_period_end: 1893456000, price: { id: "price_pro", lookup_key: "reelay_pro_monthly" } }] } } } } as unknown as import("stripe").Stripe.Event;
    await applyStripeEvent(updated);
    const [w] = await db().select().from(workspaces).where(eq(workspaces.id, wsId));
    expect(w.planKey).toBe("pro");
  });

  it("grants plan credits for a new period only, by the price on the invoice, once", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { getCreditBalance } = await import("./credits");
    const { PLANS } = await import("./plans");
    const pro = PLANS.find((p) => p.key === "pro")!;
    const deps = { lookupKeyOfPrice: async (id: string) => (id === "price_pro_annual" ? "reelay_pro_annual" : null) };
    const invoice = (id: string, reason: string) => ({ id, type: "invoice.paid", data: { object: { id: `in_${id}`, billing_reason: reason, customer: "cus_test_plan", parent: { subscription_details: { metadata: { planKey: "starter" } } }, lines: { data: [{ metadata: {}, pricing: { price_details: { price: "price_pro_annual", product: "prod_pro" } } }] } } } }) as unknown as import("stripe").Stripe.Event;
    const before = await getCreditBalance(wsId);
    // A mid-period plan change bills a proration invoice: no second month of credits.
    expect((await applyStripeEvent(invoice("evt_test_inv_1", "subscription_update"), deps)).note).toMatch(/no plan credits/);
    expect(await getCreditBalance(wsId)).toBe(before);
    // The renewal grants the plan the price belongs to (Pro), not the stale metadata (Starter), once.
    expect((await applyStripeEvent(invoice("evt_test_inv_2", "subscription_cycle"), deps)).note).toMatch(/pro/);
    await applyStripeEvent(invoice("evt_test_inv_2", "subscription_cycle"), deps);
    expect(await getCreditBalance(wsId)).toBe(before + pro.creditsPerMonth);
  });

  it("marks a failed renewal and a cancellation at period end, without touching credits", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { getCreditBalance } = await import("./credits");
    const { db, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().update(workspaces).set({ stripeCustomerId: "cus_test_dunning", planKey: "pro", subscriptionStatus: "active" }).where(eq(workspaces.id, wsId));
    const before = await getCreditBalance(wsId);
    const failed = { id: "evt_test_fail_1", type: "invoice.payment_failed", data: { object: { id: "in_failed", customer: "cus_test_dunning", attempt_count: 1 } } } as unknown as import("stripe").Stripe.Event;
    expect((await applyStripeEvent(failed)).handled).toBe(true);
    let [w] = await db().select().from(workspaces).where(eq(workspaces.id, wsId));
    expect(w.subscriptionStatus).toBe("past_due");
    expect(w.planKey).toBe("pro");
    const canceling = { id: "evt_test_cancel_1", type: "customer.subscription.updated", data: { object: { id: "sub_c", customer: "cus_test_dunning", status: "active", cancel_at_period_end: true, metadata: {}, items: { data: [{ current_period_end: 1893456000, price: { id: "p", lookup_key: "reelay_pro_monthly" } }] } } } } as unknown as import("stripe").Stripe.Event;
    await applyStripeEvent(canceling);
    [w] = await db().select().from(workspaces).where(eq(workspaces.id, wsId));
    expect(w.subscriptionStatus).toBe("canceling");
    expect(w.planKey).toBe("pro");
    // Never a real e-mail from a test: the mail helper only logs without a provider key.
    vi.stubEnv("RESEND_API_KEY", "");
    const dispute = { id: "evt_test_dispute_1", type: "charge.dispute.created", data: { object: { id: "dp_1", amount: 1900, currency: "usd", charge: "ch_1" } } } as unknown as import("stripe").Stripe.Event;
    expect((await applyStripeEvent(dispute)).note).toMatch(/reported/);
    expect(await getCreditBalance(wsId)).toBe(before);
    vi.unstubAllEnvs();
  });

  it("runs the free trial: 30 credits once at the start, no plan credits on the €0 invoice, plan credits at the first payment", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { getCreditBalance } = await import("./credits");
    const { trialAvailable } = await import("./billing");
    const { PLANS, TRIAL } = await import("./plans");
    const { db, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    const pro = PLANS.find((p) => p.key === "pro")!;
    await db().update(workspaces).set({ stripeCustomerId: "cus_test_trial", planKey: "free", trialStartedAt: null, stripeSubscriptionId: null }).where(eq(workspaces.id, wsId));
    let [w] = await db().select().from(workspaces).where(eq(workspaces.id, wsId));
    expect(trialAvailable(w)).toBe(true);
    const before = await getCreditBalance(wsId);
    const sub = { id: "sub_trial", customer: "cus_test_trial", status: "trialing", metadata: { planKey: "pro" }, items: { data: [{ current_period_end: 1893456000, price: { id: "p", lookup_key: "reelay_pro_monthly" } }] } };
    const created = { id: "evt_test_trial_1", type: "customer.subscription.created", data: { object: sub } } as unknown as import("stripe").Stripe.Event;
    await applyStripeEvent(created);
    await applyStripeEvent({ ...created, id: "evt_test_trial_2", type: "customer.subscription.updated" } as unknown as import("stripe").Stripe.Event);
    expect(await getCreditBalance(wsId)).toBe(before + TRIAL.credits);
    [w] = await db().select().from(workspaces).where(eq(workspaces.id, wsId));
    expect(w.planKey).toBe("pro");
    expect(w.trialStartedAt).not.toBeNull();
    expect(trialAvailable(w)).toBe(false);
    const deps = { lookupKeyOfPrice: async () => "reelay_pro_monthly", subscriptionStatus: async () => "trialing" };
    const invoice = (id: string, reason: string, paid: number) => ({ id, type: "invoice.paid", data: { object: { id: `in_${id}`, billing_reason: reason, amount_paid: paid, customer: "cus_test_trial", parent: { subscription_details: { subscription: "sub_trial", metadata: {} } }, lines: { data: [{ metadata: {}, pricing: { price_details: { price: "price_x", product: "prod_x" } } }] } } } }) as unknown as import("stripe").Stripe.Event;
    expect((await applyStripeEvent(invoice("evt_test_trial_inv0", "subscription_create", 0), deps)).note).toMatch(/trial started/);
    expect(await getCreditBalance(wsId)).toBe(before + TRIAL.credits);
    await applyStripeEvent(invoice("evt_test_trial_inv1", "subscription_cycle", 5900), { ...deps, subscriptionStatus: async () => "active" });
    expect(await getCreditBalance(wsId)).toBe(before + TRIAL.credits + pro.creditsPerMonth);
  });

  it("moves a cancelled subscription back to free on the workspace", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { db, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().update(workspaces).set({ stripeCustomerId: "cus_test_c", planKey: "pro" }).where(eq(workspaces.id, wsId));
    const event = { id: "evt_test_2", type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_test_c", status: "canceled", items: { data: [] }, metadata: {} } } } as unknown as import("stripe").Stripe.Event;
    expect((await applyStripeEvent(event)).handled).toBe(true);
    const [w] = await db().select().from(workspaces).where(eq(workspaces.id, wsId));
    expect(w.planKey).toBe("free");
  });
});
