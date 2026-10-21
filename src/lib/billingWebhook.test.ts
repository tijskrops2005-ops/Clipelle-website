import { afterAll, describe, expect, it } from "vitest";

/**
 * The Stripe event applier with constructed events (no HTTP, no Stripe account). Needs the
 * database for the ledger; skipped without DATABASE_URL. Checks idempotency on a replay.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const userId = "00000000-0000-0000-0000-00000000000c";

describe.skipIf(!hasDb)("stripe webhook applier", () => {
  afterAll(async () => {
    const { db, creditLedger, profiles } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().delete(creditLedger).where(eq(creditLedger.userId, userId));
    await db().delete(profiles).where(eq(profiles.userId, userId));
  });

  it("grants a credit pack once for the same checkout session", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { getCreditBalance } = await import("./credits");
    const { TOPUPS } = await import("./plans");
    const { db, profiles } = await import("@/lib/db");
    await db().insert(profiles).values({ userId, email: "webhook-test@reelay.local" }).onConflictDoNothing();
    const event = { id: "evt_test_1", type: "checkout.session.completed", data: { object: { id: "cs_test_123", metadata: { userId, kind: "topup", topupKey: TOPUPS[0].key }, customer: "cus_test" } } } as unknown as import("stripe").Stripe.Event;
    const first = await applyStripeEvent(event);
    expect(first.handled).toBe(true);
    const balance = await getCreditBalance(userId);
    expect(balance).toBe(TOPUPS[0].credits);
    await applyStripeEvent(event); // replay
    expect(await getCreditBalance(userId)).toBe(TOPUPS[0].credits);
  });

  it("moves a cancelled subscription back to free", async () => {
    const { applyStripeEvent } = await import("./billingWebhook");
    const { db, profiles } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().update(profiles).set({ stripeCustomerId: "cus_test_c", planKey: "pro" }).where(eq(profiles.userId, userId));
    const event = { id: "evt_test_2", type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_test_c", status: "canceled", items: { data: [] }, metadata: {} } } } as unknown as import("stripe").Stripe.Event;
    expect((await applyStripeEvent(event)).handled).toBe(true);
    const [p] = await db().select().from(profiles).where(eq(profiles.userId, userId));
    expect(p.planKey).toBe("free");
  });
});
