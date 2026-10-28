import "server-only";
import { and, desc, eq, inArray, notExists, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, projects, qualityReports, translations } from "@/lib/db/schema";
import { inngest, qualityCheckRequested } from "@/lib/inngest/client";
import { isAdmin } from "@/lib/adminAccess";
import { RATING_LABELS, type QualityCheck } from "@/lib/quality/report";

/**
 * Data for /admin/quality (28 Oct 2026). Full details (findings, what was heard, frames) only for
 * projects of an administrator, i.e. Tijs's own test videos; for customers' videos the page shows the
 * score and which checks are red or orange, never their content (the admin rule).
 */

export type QualityRow = {
  id: string;
  projectId: string;
  projectName: string;
  language: string;
  createdAt: string;
  status: string;
  score: number | null;
  costUsd: number | null;
  own: boolean;
  checks: QualityCheck[];
  heard: string | null;
  frames: { first: string; middle: string; last: string } | null;
  rating: "good" | "bad" | null;
  labels: string[];
  note: string | null;
  error: string | null;
};

export async function listQualityReports(limit = 60): Promise<QualityRow[]> {
  const rows = await db()
    .select({ r: qualityReports, name: projects.name, email: profiles.email })
    .from(qualityReports)
    .innerJoin(projects, eq(projects.id, qualityReports.projectId))
    .leftJoin(profiles, eq(profiles.userId, projects.ownerId))
    .orderBy(desc(qualityReports.createdAt))
    .limit(limit);
  return rows.map(({ r, name, email }) => {
    const own = isAdmin(email);
    const facts = (r.facts ?? {}) as { heard?: string | null; frames?: QualityRow["frames"] };
    return {
      id: r.id,
      projectId: r.projectId,
      projectName: own ? name : "Customer video",
      language: r.language,
      createdAt: r.createdAt.toISOString(),
      status: r.status,
      score: r.score,
      costUsd: r.costUsd,
      own,
      checks: own ? r.checks : r.checks.map((c) => ({ key: c.key, label: c.label, status: c.status, detail: c.status === "pass" ? "" : "Details hidden: customer video." })),
      heard: own ? (facts.heard ?? null) : null,
      frames: own ? (facts.frames ?? null) : null,
      rating: r.rating === "good" || r.rating === "bad" ? r.rating : null,
      labels: r.labels ?? [],
      note: own ? r.note : null,
      error: r.error,
    };
  });
}

/** Finished language versions of the admin's own projects that have no report yet (to check older videos). */
export async function listUnchecked(adminUserId: string, limit = 10) {
  return db()
    .select({ projectId: translations.projectId, language: translations.language, name: projects.name, updatedAt: translations.updatedAt })
    .from(translations)
    .innerJoin(projects, eq(projects.id, translations.projectId))
    .where(
      and(
        eq(projects.ownerId, adminUserId),
        eq(translations.status, "completed"),
        notExists(db().select({ one: sql`1` }).from(qualityReports).where(and(eq(qualityReports.projectId, translations.projectId), eq(qualityReports.language, translations.language)))),
      ),
    )
    .orderBy(desc(translations.updatedAt))
    .limit(limit);
}

export async function requestQualityCheck(projectId: string, language: string) {
  const [t] = await db().select({ status: translations.status }).from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, language))).limit(1);
  if (!t) return { ok: false as const, error: "No such language version." };
  if (t.status !== "completed") return { ok: false as const, error: "Only a finished language version can be checked." };
  await inngest.send(qualityCheckRequested.create({ projectId, language }));
  return { ok: true as const };
}

export async function rateQualityReport(id: string, input: { rating?: "good" | "bad" | null; labels?: string[]; note?: string | null }) {
  const labels = input.labels?.filter((l): l is (typeof RATING_LABELS)[number] => (RATING_LABELS as readonly string[]).includes(l));
  const [row] = await db()
    .update(qualityReports)
    .set({
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(labels ? { labels } : {}),
      ...(input.note !== undefined ? { note: input.note?.trim().slice(0, 1000) || null } : {}),
      ratedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(inArray(qualityReports.id, [id]))
    .returning({ id: qualityReports.id });
  return row ? { ok: true as const } : { ok: false as const, error: "Report not found." };
}
