import { afterAll, describe, expect, it } from "vitest";
import type { AdInput, TranslateInput } from "@/lib/db/schema";

/**
 * Free-ad rules against the database (skipped without DATABASE_URL): the grant is idempotent,
 * the daily cap blocks new grants, a free account starts ads only as the free 10 s combination, and
 * a translation only within the free credits (25 Oct 2026: translations are allowed on the free plan).
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const userId = "00000000-0000-0000-0000-00000000000d";
const user = { id: userId, email: "free-test@clipelle.local", emailVerified: true };
let scope: { userId: string; workspaceId: string };

describe.skipIf(!hasDb)("free ad rules", () => {
  const created: string[] = [];
  afterAll(async () => {
    const { db, creditLedger, profiles, projects, workspaces } = await import("@/lib/db");
    const { eq, inArray } = await import("drizzle-orm");
    if (created.length) await db().delete(projects).where(inArray(projects.id, created));
    await db().delete(creditLedger).where(eq(creditLedger.userId, userId));
    await db().delete(workspaces).where(eq(workspaces.ownerUserId, userId));
    await db().delete(profiles).where(eq(profiles.userId, userId));
    delete process.env.FREE_ADS_PER_DAY;
  });

  it("grants once and respects the daily cap", async () => {
    const { ensureFreeAd } = await import("./billing");
    const { getOrCreateProfile } = await import("./data/profile");
    const { getCreditBalance } = await import("./credits");
    const { FREE_AD_CREDITS } = await import("./plans");
    await getOrCreateProfile(user);
    const { ensurePersonalWorkspace } = await import("./workspaces");
    scope = { userId, workspaceId: (await ensurePersonalWorkspace(user)).id };
    process.env.FREE_ADS_PER_DAY = "0";
    expect((await ensureFreeAd(user, scope.workspaceId)).reason).toBe("cap");
    delete process.env.FREE_ADS_PER_DAY;
    expect((await ensureFreeAd({ ...user, emailVerified: false }, scope.workspaceId)).reason).toBe("unverified");
    expect((await ensureFreeAd(user, scope.workspaceId)).granted).toBe(true);
    expect((await ensureFreeAd(user, scope.workspaceId)).reason).toBe("already");
    expect(await getCreditBalance(scope.workspaceId)).toBe(FREE_AD_CREDITS);
  });

  it("keeps a free account to the 10 s Standard ad and to translations within its free credits", async () => {
    const data = await import("./data/server");
    const long = await data.createDraft(scope, { workflow: "ad", ad: { name: "Free rule 30 s", seconds: 30, engine: "avatar_iii", language: "en", speed: "normal", tone: "direct", reviewScript: false, productName: "X", description: "Twenty characters of description here." } });
    created.push(long.id);
    const { db, projects } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    // Pretend an image is attached so the only remaining rule is the free-plan one.
    await db().update(projects).set({ input: { ...(long.input as AdInput), imageAssetIds: ["00000000-0000-0000-0000-000000000099"] } }).where(eq(projects.id, long.id));
    await expect(data.startProject(scope, long.id)).rejects.toMatchObject({ code: "free_plan_limit" });
    // 60 s of Speed translation needs 60 credits; the free 30 do not cover it (a 30 s one would start a real run, so it is not started here).
    const translate = await data.createDraft(scope, { workflow: "translate", translate: { name: "Free rule translate", sourceFileName: "a.mp4", sourceSeconds: 60, sourceLanguage: "auto", targetLanguages: ["nl"], quality: "speed", format: "9:16", enhance: false, rightsConfirmed: true } });
    created.push(translate.id);
    await db().update(projects).set({ input: { ...(translate.input as TranslateInput), sourceAssetId: "00000000-0000-0000-0000-000000000098" } }).where(eq(projects.id, translate.id));
    await expect(data.startProject(scope, translate.id)).rejects.toMatchObject({ code: "insufficient_credits" });
  });
});
