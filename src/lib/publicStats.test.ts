import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_STATS_MIN, publicStatsMin, statColumns } from "./publicStats";

const facts = { measuredAdMinutes: 6, languageCount: 190 };

describe("statColumns", () => {
  it("falls back to a product fact in every column without data", () => {
    expect(statColumns(null, 50, facts)).toEqual([
      { kind: "fact", key: "ready", n: 6 },
      { kind: "fact", key: "languages", n: 190 },
      { kind: "fact", key: "formats" },
    ]);
  });

  it("shows a number only from the threshold, exactly as counted", () => {
    const cols = statColumns({ videos: 50, languages: 49, workspaces: 1240 }, 50, facts);
    expect(cols[0]).toEqual({ kind: "number", key: "videos", value: 50 });
    expect(cols[1]).toEqual({ kind: "fact", key: "languages", n: 190 });
    expect(cols[2]).toEqual({ kind: "number", key: "workspaces", value: 1240 });
  });

  it("never claims a measured time that was not measured", () => {
    expect(statColumns(null, 50, { measuredAdMinutes: null, languageCount: 190 })[0]).toEqual({ kind: "fact", key: "freeAd" });
  });

  it("reads the threshold from the environment, with 50 as the default", () => {
    expect(publicStatsMin(undefined)).toBe(DEFAULT_PUBLIC_STATS_MIN);
    expect(publicStatsMin("abc")).toBe(50);
    expect(publicStatsMin("0")).toBe(50);
    expect(publicStatsMin("200")).toBe(200);
  });
});

/**
 * Against the real database (skipped without DATABASE_URL): throw-away workspaces with finished,
 * failed and demo projects; only real finished work counts. The count is narrowed to these
 * workspaces so real data never changes the result.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("countPublicStats", () => {
  let dbmod: typeof import("@/lib/db");
  const owner = crypto.randomUUID();
  const demoOwner = "00000000-0000-0000-0000-0000000000c5";
  const wsIds: string[] = [];

  beforeAll(async () => {
    dbmod = await import("@/lib/db");
    const d = dbmod.db();
    const [ws] = await d.insert(dbmod.workspaces).values({ name: "Stats test", kind: "team", ownerUserId: owner }).returning();
    const [demoWs] = await d.insert(dbmod.workspaces).values({ name: "Stats demo", kind: "team", ownerUserId: demoOwner }).returning();
    wsIds.push(ws.id, demoWs.id);
    const input = { workflow: "ad" } as never;
    const row = (workspaceId: string, ownerId: string, workflow: "ad" | "translate", status: "completed" | "failed" | "processing") => ({ workspaceId, ownerId, workflow, status, name: "stats test", input });
    await d.insert(dbmod.projects).values([
      row(ws.id, owner, "ad", "completed"),
      row(ws.id, owner, "ad", "failed"),
      row(ws.id, owner, "ad", "processing"),
      row(demoWs.id, demoOwner, "ad", "completed"),
    ]);
    const [tr] = await d.insert(dbmod.projects).values(row(ws.id, owner, "translate", "completed")).returning();
    const [trFailed] = await d.insert(dbmod.projects).values(row(ws.id, owner, "translate", "failed")).returning();
    await d.insert(dbmod.translations).values([
      { projectId: tr.id, language: "nl" as never, status: "completed" },
      { projectId: tr.id, language: "de" as never, status: "completed" },
      { projectId: tr.id, language: "fr" as never, status: "failed" },
      { projectId: trFailed.id, language: "es" as never, status: "completed" },
    ]);
  });

  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    if (!dbmod) return;
    await dbmod.db().delete(dbmod.projects).where(inArray(dbmod.projects.workspaceId, wsIds));
    await dbmod.db().delete(dbmod.workspaces).where(inArray(dbmod.workspaces.id, wsIds));
  });

  it("counts finished videos only, without failed, unfinished or demo projects", async () => {
    const { countPublicStats } = await import("./publicStats");
    // 1 finished ad + 2 finished language versions; the failed/processing ads, the failed language,
    // the language of a failed project and the demo owner's ad do not count.
    expect(await countPublicStats({ workspaceIds: wsIds })).toEqual({ videos: 3, languages: 2, workspaces: 1 });
  });
});
