import "server-only";
import { cacheLife } from "next/cache";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { config } from "@/lib/config";
import { adminEmails } from "@/lib/adminAccess";

/**
 * The live numbers on the homepage (25 Oct 2026), from our own database only: finished videos
 * (ads plus finished language versions), the languages videos were translated into, and the
 * workspaces with at least one finished video. Failed and unfinished projects never count, and
 * neither do test and demo data: owners or workspaces with the all-zero test ids, test accounts on
 * .local/.test addresses and the team's own accounts (ADMIN_EMAILS).
 *
 * A number is shown only from PUBLIC_STATS_MIN (default 50); below that its column shows a product
 * fact instead. Exact numbers, never rounded up, never a "+".
 */

export type PublicCounts = { videos: number; languages: number; workspaces: number };

export const DEFAULT_PUBLIC_STATS_MIN = 50;

export function publicStatsMin(raw: string | undefined = process.env.PUBLIC_STATS_MIN): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PUBLIC_STATS_MIN;
}

export type StatColumn =
  | { kind: "number"; key: keyof PublicCounts; value: number }
  | { kind: "fact"; key: "ready" | "languages" | "formats" | "freeAd"; n?: number };

/** Three columns: each a real number at or above the threshold, otherwise a product fact. */
export function statColumns(counts: PublicCounts | null, min: number, facts: { measuredAdMinutes: number | null; languageCount: number }): StatColumn[] {
  const show = (key: keyof PublicCounts) => (counts && counts[key] >= min ? { kind: "number" as const, key, value: counts[key] } : null);
  return [
    show("videos") ?? (facts.measuredAdMinutes != null ? { kind: "fact", key: "ready", n: facts.measuredAdMinutes } : { kind: "fact", key: "freeAd" }),
    show("languages") ?? { kind: "fact", key: "languages", n: facts.languageCount },
    show("workspaces") ?? { kind: "fact", key: "formats" },
  ];
}

const TEST_ID = "00000000-0000-0000-0000-%";

/** The counts straight from the database. `workspaceIds` narrows the count (tests only). */
export async function countPublicStats(opts: { workspaceIds?: string[] } = {}): Promise<PublicCounts> {
  const { db, projects, translations } = await import("@/lib/db");
  const admins = adminEmails().map((e) => e.toLowerCase());
  const adminClause = admins.length ? sql` or lower(pr.email) in (${sql.join(admins.map((a) => sql`${a}`), sql`, `)})` : sql``;
  const notTest = sql`not (
    ${projects.ownerId} is null
    or ${projects.ownerId} like ${TEST_ID}
    or ${projects.workspaceId}::text like ${TEST_ID}
    or exists (select 1 from profiles pr where pr.user_id = ${projects.ownerId} and (pr.email ilike '%.local' or pr.email ilike '%.test'${adminClause}))
  )`;
  const base: SQL[] = [eq(projects.status, "completed"), notTest];
  if (opts.workspaceIds) base.push(opts.workspaceIds.length ? inArray(projects.workspaceId, opts.workspaceIds) : sql`false`);

  const [ads] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(projects)
    .where(and(...base, eq(projects.workflow, "ad")));
  const [tr] = await db()
    .select({ n: sql<number>`count(*)::int`, langs: sql<number>`count(distinct ${translations.language})::int` })
    .from(translations)
    .innerJoin(projects, eq(translations.projectId, projects.id))
    .where(and(...base, eq(projects.workflow, "translate"), eq(translations.status, "completed")));
  const [ws] = await db()
    .select({ n: sql<number>`count(distinct ${projects.workspaceId})::int` })
    .from(projects)
    .where(and(...base, sql`(${projects.workflow} = 'ad' or exists (select 1 from translations t where t.project_id = ${projects.id} and t.status = 'completed'))`));

  return { videos: (ads?.n ?? 0) + (tr?.n ?? 0), languages: tr?.langs ?? 0, workspaces: ws?.n ?? 0 };
}

/** What the homepage reads: the counts, cached for an hour; null in demo mode or when the database cannot answer. */
export async function cachedPublicStats(): Promise<PublicCounts | null> {
  "use cache";
  cacheLife("hours");
  if (config.demoMode) return null;
  try {
    return await Promise.race([countPublicStats(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("public stats timed out")), 5000))]);
  } catch {
    return null;
  }
}
