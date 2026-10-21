import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Credits never expire (skipped without DATABASE_URL): subscription credits from a past month stay,
 * a cancelled subscription keeps its credits, a deleted account loses them, the free credit expires
 * after 30 days.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const userId = "00000000-0000-0000-0000-0000000000c1";

describe.skipIf(!hasDb)("credit expiry rules", () => {
  beforeAll(async () => {
    const { db, profiles } = await import("@/lib/db");
    await db().insert(profiles).values({ userId, email: "credits-test@reelay.local", planKey: "starter" }).onConflictDoNothing();
  });
  afterAll(async () => {
    const { db, creditLedger, profiles } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await db().delete(creditLedger).where(eq(creditLedger.userId, userId));
    await db().delete(profiles).where(eq(profiles.userId, userId));
  });

  it("keeps subscription credits from an old month and after cancelling", async () => {
    const { grantPlanCredits, setPlan } = await import("./billing");
    const { getCreditBalance } = await import("./credits");
    const { db, creditLedger } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    await grantPlanCredits(userId, "starter", "inv_old_month", threeMonthsAgo);
    // Make the grant look three months old.
    await db().update(creditLedger).set({ createdAt: threeMonthsAgo }).where(eq(creditLedger.reference, "invoice:inv_old_month"));
    const [row] = await db().select().from(creditLedger).where(eq(creditLedger.reference, "invoice:inv_old_month"));
    expect(row.expiresAt).toBeNull();
    const before = await getCreditBalance(userId);
    expect(before).toBeGreaterThanOrEqual(270);
    // Cancelled subscription: the plan goes back to free, the credits stay.
    await setPlan(userId, { planKey: "free", subscriptionStatus: "canceled", stripeSubscriptionId: null });
    expect(await getCreditBalance(userId)).toBe(before);
  });

  it("gives a credit pack without an expiry", async () => {
    const { grantTopupCredits } = await import("./billing");
    const { db, creditLedger } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    await grantTopupCredits(userId, "topup_10", "cs_test_pack");
    const [row] = await db().select().from(creditLedger).where(eq(creditLedger.reference, "checkout:cs_test_pack"));
    expect(row.credits).toBe(110);
    expect(row.expiresAt).toBeNull();
  });

  it("expires the free first ad after 30 days", async () => {
    const { freeAdExpiry } = await import("./billing");
    const { CREDIT_EXPIRY } = await import("./plans");
    const { grantCredits, getCreditBalance } = await import("./credits");
    const { db, creditLedger } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    const now = new Date();
    expect(Math.round((freeAdExpiry(now).getTime() - now.getTime()) / 86_400_000)).toBe(CREDIT_EXPIRY.freeAdDays);
    const base = await getCreditBalance(userId);
    await grantCredits({ userId, credits: 20, kind: "grant_free", expiresAt: freeAdExpiry(now), reference: "free:test" });
    expect(await getCreditBalance(userId)).toBe(base + 20);
    // 31 days later: the free credits are gone, the paid ones stay.
    await db().update(creditLedger).set({ expiresAt: new Date(now.getTime() - 1000) }).where(eq(creditLedger.reference, "free:test"));
    expect(await getCreditBalance(userId)).toBe(base);
  });

  it("forfeits every credit when the account is deleted", async () => {
    const { deleteAccountData } = await import("./data/profile");
    const { getCreditBalance, listLedger } = await import("./credits");
    expect(await getCreditBalance(userId)).toBeGreaterThan(0);
    await deleteAccountData(userId);
    expect(await getCreditBalance(userId)).toBe(0);
    expect(await listLedger(userId)).toEqual([]);
  });
});
