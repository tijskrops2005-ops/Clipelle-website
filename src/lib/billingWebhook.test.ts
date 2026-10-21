import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
    await db().insert(profiles).values({ userId, email: "webhook-test@reelay.local" }).onConflictDoNothing();
    const { ensurePersonalWorkspace } = await import("./workspaces");
    wsId = (await ensurePersonalWorkspace({ id: userId, email: "webhook-test@reelay.local" })).id;
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
