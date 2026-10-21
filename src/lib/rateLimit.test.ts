import { afterAll, describe, expect, it } from "vitest";

/**
 * The shared rate limiter against the database (skipped without DATABASE_URL): a fixed window
 * counts across calls, refuses above the limit with a retry time, keeps keys apart, and opens
 * again when the window has passed.
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const prefix = `test:${Date.now().toString(36)}:`;

describe.skipIf(!hasDb)("rate limits in the database", () => {
  afterAll(async () => {
    const { db, rateLimits } = await import("@/lib/db");
    const { like } = await import("drizzle-orm");
    await db().delete(rateLimits).where(like(rateLimits.key, `${prefix}%`));
  });

  it("counts across calls and refuses above the limit", async () => {
    const { rateLimit } = await import("./rateLimit");
    const key = `${prefix}login`;
    for (let i = 1; i <= 3; i++) {
      const r = await rateLimit(key, 3, 60_000);
      expect(r.ok).toBe(true);
      expect(r.count).toBe(i);
      expect(r.retryAfterSeconds).toBe(0);
    }
    const refused = await rateLimit(key, 3, 60_000);
    expect(refused.ok).toBe(false);
    expect(refused.count).toBe(4);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    expect(refused.retryAfterSeconds).toBeLessThanOrEqual(60);
    // Another key is a separate counter.
    expect((await rateLimit(`${prefix}other`, 3, 60_000)).ok).toBe(true);
  });

  it("opens again after the window", async () => {
    const { rateLimit } = await import("./rateLimit");
    const key = `${prefix}short`;
    const windowMs = 1500;
    const first = await rateLimit(key, 1, windowMs);
    expect(first.ok).toBe(true);
    expect((await rateLimit(key, 1, windowMs)).ok).toBe(false);
    await new Promise((r) => setTimeout(r, first.resetAt.getTime() - Date.now() + 50));
    const again = await rateLimit(key, 1, windowMs);
    expect(again.ok).toBe(true);
    expect(again.count).toBe(1);
  });

  it("is one counter for parallel calls", async () => {
    const { rateLimit } = await import("./rateLimit");
    const key = `${prefix}parallel`;
    const results = await Promise.all(Array.from({ length: 8 }, () => rateLimit(key, 5, 60_000)));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
    expect(results.filter((r) => !r.ok)).toHaveLength(3);
    expect(new Set(results.map((r) => r.count)).size).toBe(8);
  });
});
