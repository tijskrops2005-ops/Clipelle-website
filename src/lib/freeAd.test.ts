import { afterAll, describe, expect, it } from "vitest";

/**
 * Free-ad rules against the database (skipped without DATABASE_URL): the grant is idempotent,
 * the daily cap blocks new grants, and a free account can only start the free combination.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const userId = "00000000-0000-0000-0000-00000000000d";
const user = { id: userId, email: "free-test@reelay.local", emailVerified: true };

describe.skipIf(!hasDb)("free ad rules", () => {
  const created: string[] = [];
  afterAll(async () => {
    const { db, creditLedger, profiles, projects } = await import("@/lib/db");
    const { eq, inArray } = await import("drizzle-orm");
    if (created.length) await db().delete(projects).where(inArray(projects.id, created));
    await db().delete(creditLedger).where(eq(creditLedger.userId, userId));
    await db().delete(profiles).where(eq(profiles.userId, userId));
    delete process.env.FREE_ADS_PER_DAY;
  });

  it("grants once and respects the daily cap", async () => {
    const { ensureFreeAd } = await import("./billing");
    const { getOrCreateProfile } = await import("./data/profile");
    const { getCreditBalance } = await import("./credits");
    const { FREE_AD_CREDITS } = await import("./plans");
    await getOrCreateProfile(user);
    process.env.FREE_ADS_PER_DAY = "0";
    expect((await ensureFreeAd(user)).reason).toBe("cap");
    delete process.env.FREE_ADS_PER_DAY;
    expect((await ensureFreeAd({ ...user, emailVerified: false })).reason).toBe("unverified");
    expect((await ensureFreeAd(user)).granted).toBe(true);
    expect((await ensureFreeAd(user)).reason).toBe("already");
    expect(await getCreditBalance(userId)).toBe(FREE_AD_CREDITS);
  });

  it("lets a free account start only a 10 s Standard ad", async () => {
    const data = await import("./data/server");
    const long = await data.createDraft(userId, { workflow: "ad", ad: { name: "Free rule 30 s", seconds: 30, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "X", description: "Twenty characters of description here." } });
    created.push(long.id);
    const { db, projects } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    // Pretend an image is attached so the only remaining rule is the free-plan one.
    await db().update(projects).set({ input: { ...(long.input as Record<string, unknown>), imageAssetIds: ["00000000-0000-0000-0000-000000000099"] } }).where(eq(projects.id, long.id));
    await expect(data.startProject(userId, long.id)).rejects.toMatchObject({ code: "free_plan_limit" });
    const translate = await data.createDraft(userId, { workflow: "translate", translate: { name: "Free rule translate", sourceFileName: "a.mp4", sourceSeconds: 8, sourceLanguage: "auto", targetLanguages: ["nl"], quality: "speed", format: "9:16", enhance: false, rightsConfirmed: true } });
    created.push(translate.id);
    await db().update(projects).set({ input: { ...(translate.input as Record<string, unknown>), sourceAssetId: "00000000-0000-0000-0000-000000000098" } }).where(eq(projects.id, translate.id));
    await expect(data.startProject(userId, translate.id)).rejects.toMatchObject({ code: "free_plan_limit" });
  });
});
