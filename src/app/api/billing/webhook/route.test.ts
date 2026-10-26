import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

/**
 * The Stripe webhook route end to end with Managed Payments events (26 Oct 2026): signed exactly as
 * Stripe signs them (stripe-node's test header, a local secret), sent to the real route, applied to
 * the database. No Stripe account, no network, no payment. Skipped without DATABASE_URL.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const SECRET = "whsec_local_managed_payments_test";
const userId = "00000000-0000-0000-0000-0000000000a7";
const customer = `cus_mp_${Date.now()}`;
const run = Date.now();
const eventIds: string[] = [];
let wsId = "";

async function post(event: Record<string, unknown>, secret = SECRET) {
  const payload = JSON.stringify(event);
  const header = new Stripe("sk_test_local").webhooks.generateTestHeaderString({ payload, secret });
  const { POST } = await import("./route");
  return POST(new Request("http://localhost/api/billing/webhook", { method: "POST", headers: { "stripe-signature": header, "content-type": "application/json" }, body: payload }));
}

function event(type: string, object: Record<string, unknown>) {
  const id = `evt_mp_${run}_${eventIds.length}`;
  eventIds.push(id);
  return { id, object: "event", type, api_version: Stripe.API_VERSION, created: Math.floor(Date.now() / 1000), livemode: false, data: { object } };
}

describe.skipIf(!hasDb)("stripe webhook route with Managed Payments", () => {
  beforeAll(async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    const { db, profiles, workspaces } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().insert(profiles).values({ userId, email: "mp-webhook-test@clipelle.local" }).onConflictDoNothing();
    const { ensurePersonalWorkspace } = await import("@/lib/workspaces");
    wsId = (await ensurePersonalWorkspace({ id: userId, email: "mp-webhook-test@clipelle.local" })).id;
    await db().update(workspaces).set({ stripeCustomerId: customer, planKey: "free" }).where(eq(workspaces.id, wsId));
  });

  afterAll(async () => {
    const { db, creditLedger, profiles, webhookEvents, workspaces } = await import("@/lib/db");
    const { eq, inArray } = await import("drizzle-orm");
    if (eventIds.length) await db().delete(webhookEvents).where(inArray(webhookEvents.externalId, eventIds));
    await db().delete(creditLedger).where(eq(creditLedger.workspaceId, wsId));
    await db().delete(workspaces).where(eq(workspaces.ownerUserId, userId));
    await db().delete(profiles).where(eq(profiles.userId, userId));
    vi.unstubAllEnvs();
  });

  it("refuses an event with a wrong signature", async () => {
    const res = await post(event("checkout.session.completed", { id: "cs_bad" }), "whsec_someone_else");
    expect(res.status).toBe(400);
  });

  it("grants a credit pack bought through a Managed Payments session, once", async () => {
    const { TOPUPS } = await import("@/lib/plans");
    const { getCreditBalance } = await import("@/lib/credits");
    const pack = TOPUPS[0];
    const completed = event("checkout.session.completed", {
      id: `cs_mp_${run}`,
      object: "checkout.session",
      mode: "payment",
      payment_status: "paid",
      customer,
      managed_payments: { enabled: true },
      metadata: { userId, workspaceId: wsId, topupKey: pack.key, kind: "topup" },
    });
    const first = await post(completed);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, handled: true });
    expect(await getCreditBalance(wsId)).toBe(pack.credits);
    // Stripe retries: the same event again changes nothing.
    const replay = await post(completed);
    expect(await replay.json()).toMatchObject({ duplicate: true });
    expect(await getCreditBalance(wsId)).toBe(pack.credits);
  });

  it("grants the plan credits for a Managed Payments subscription invoice and sets the plan", async () => {
    const { PLANS } = await import("@/lib/plans");
    const { getCreditBalance } = await import("@/lib/credits");
    const { getWorkspace } = await import("@/lib/workspaces");
    const starter = PLANS.find((p) => p.key === "starter")!;
    const before = await getCreditBalance(wsId);
    const paid = event("invoice.paid", {
      id: `in_mp_${run}`,
      object: "invoice",
      billing_reason: "subscription_create",
      customer,
      parent: { type: "subscription_details", subscription_details: { subscription: `sub_mp_${run}`, metadata: { userId, workspaceId: wsId, planKey: "starter" } } },
      lines: { object: "list", data: [{ id: "il_1", metadata: {} }] },
    });
    const res = await post(paid);
    expect(await res.json()).toMatchObject({ handled: true });
    expect(await getCreditBalance(wsId)).toBe(before + starter.creditsPerMonth);
    expect((await getWorkspace(wsId))?.planKey).toBe("starter");
  });
});
