import { describe, expect, it } from "vitest";
import { isAdmin, periodStart } from "./admin";

describe("admin access", () => {
  it("matches ADMIN_EMAILS case-insensitively and trimmed, nobody when empty", () => {
    const list = ["tijs@example.com", "ops@example.com"];
    expect(isAdmin("Tijs@Example.com", list)).toBe(true);
    expect(isAdmin(" ops@example.com ", list)).toBe(true);
    expect(isAdmin("someone@example.com", list)).toBe(false);
    expect(isAdmin("tijs@example.com", [])).toBe(false);
    expect(isAdmin(null, list)).toBe(false);
  });
  it("computes period starts", () => {
    const now = new Date("2026-10-21T15:00:00Z");
    expect(periodStart("day", now).toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect(periodStart("week", now).toISOString()).toBe("2026-10-14T15:00:00.000Z");
    expect(periodStart("month", now).toISOString()).toBe("2026-09-21T15:00:00.000Z");
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);
describe.skipIf(!hasDb)("admin stats", () => {
  it("returns aggregates only (no scripts, photos or videos)", async () => {
    const { getAdminStats } = await import("./admin");
    const stats = await getAdminStats("week");
    expect(typeof stats.users).toBe("number");
    expect(stats.perWorkflow.map((w) => w.workflow)).toEqual(["ad", "translate"]);
    const text = JSON.stringify(stats);
    expect(text).not.toMatch(/presenterScript|imageAssetIds|finalVideoUrl|storagePath/);
  });
});
