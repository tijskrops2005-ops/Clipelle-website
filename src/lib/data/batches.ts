import { FEATURE_PLAN, hasFeature } from "@/lib/plans";
import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, projectBatches, projects, workspaces, type AdInput } from "@/lib/db";
import { DataError } from "@/lib/data/errors";
import { createDraft, creditsForProject, estimateForProject, listProjectsOfBatch, startProject, type DataScope, type NewAdProject } from "@/lib/data/server";
import { getCreditBalance } from "@/lib/credits";
import { checkUserLimits } from "@/lib/services/costGuard";
import { MAX_BATCH_VARIANTS, MIN_BATCH_VARIANTS, variantFields, variantLabel, type Variant } from "@/content/formats";
import { DIRECTION_MAX_CHARS } from "@/lib/adOptions";
import type { Batch, Project } from "@/lib/types";
import { batchStatusOf } from "@/lib/batches";

/**
 * "Make variations" (2026-10-21): 2–5 variants of one product. Every variant is its own project
 * with its own run, so the budget per creative, the retry per step and the ledger rows stay exactly
 * as they are. The batch is the grouping plus one start: all credits are reserved before the first
 * run begins (the balance is checked for the total, then every project reserves its own), and a
 * variant that fails refunds only its own reservation while the others finish.
 */

export async function createBatch(scope: DataScope, input: { ad: NewAdProject; variants: Variant[] }) {
  if (input.variants.length < MIN_BATCH_VARIANTS || input.variants.length > MAX_BATCH_VARIANTS) {
    throw new DataError(`A batch has ${MIN_BATCH_VARIANTS} to ${MAX_BATCH_VARIANTS} variations.`, 400, "bad_variants");
  }
  const [ws] = await db().select({ planKey: workspaces.planKey }).from(workspaces).where(eq(workspaces.id, scope.workspaceId)).limit(1);
  if (!hasFeature(ws?.planKey, "variations")) throw new DataError(`Variations come with the ${FEATURE_PLAN.variations} plan. Upgrade in Billing to make 2 to 5 versions at once.`, 402, "plan_feature");
  const seen = new Set(input.variants.map((v) => JSON.stringify(v)));
  if (seen.size !== input.variants.length) throw new DataError("Every variation must be different.", 400, "bad_variants");

  const [batch] = await db().insert(projectBatches).values({ ownerId: scope.userId, workspaceId: scope.workspaceId, name: input.ad.name, status: "processing" }).returning();
  const ids: string[] = [];
  for (const variant of input.variants) {
    const fields = variantFields(variant, input.ad.direction ?? "", input.ad.tone, DIRECTION_MAX_CHARS);
    const row = await createDraft(scope, { workflow: "ad", ad: { ...input.ad, name: `${input.ad.name} · ${variantLabel(variant)}`, direction: fields.direction, tone: fields.tone, format: fields.format, hook: fields.hook, batchId: batch.id } });
    ids.push(row.id);
  }
  return { batch, projectIds: ids };
}

/**
 * Starts every draft of the batch. Before anything starts: the per-account limits for the total,
 * and the workspace balance for the total credits. Then each project starts through startProject
 * (its own budget check and its own reservation). Idempotent: already started projects are skipped.
 */
export async function startBatch(scope: DataScope, batchId: string) {
  const batch = await getBatchRow(scope, batchId);
  const rows = await db().select().from(projects).where(and(eq(projects.batchId, batchId), eq(projects.workspaceId, scope.workspaceId))).orderBy(projects.createdAt);
  const drafts = rows.filter((r) => r.status === "draft");
  if (drafts.length > 0) {
    const totalUsd = drafts.reduce((sum, r) => sum + estimateForProject(r), 0);
    const perUser = await checkUserLimits(scope.userId, totalUsd);
    if (!perUser.ok) throw new DataError(perUser.message, 429, "user_limit");
    const totalCredits = drafts.reduce((sum, r) => sum + creditsForProject(r), 0);
    const balance = await getCreditBalance(scope.workspaceId);
    if (balance < totalCredits) throw new DataError(`These ${drafts.length} variations need ${totalCredits} credits together and the workspace has ${balance}. Add credits in Billing or choose fewer variations.`, 402, "insufficient_credits");
  }
  const started: string[] = [];
  const failed: { id: string; message: string }[] = [];
  for (const row of drafts) {
    try {
      await startProject(scope, row.id);
      started.push(row.id);
    } catch (error) {
      failed.push({ id: row.id, message: error instanceof Error ? error.message : "Could not start this variation." });
    }
  }
  if (failed.length > 0 && started.length === 0 && rows.every((r) => r.status === "draft")) {
    throw new DataError(failed[0].message, 409, "batch_not_started");
  }
  return { batch, started, failed, already: rows.filter((r) => r.status !== "draft").map((r) => r.id) };
}

async function getBatchRow(scope: DataScope, batchId: string) {
  const [batch] = await db().select().from(projectBatches).where(and(eq(projectBatches.id, batchId), eq(projectBatches.workspaceId, scope.workspaceId))).limit(1);
  if (!batch) throw new DataError("Batch not found.", 404, "not_found");
  return batch;
}

/** The batch with its variants, scoped to the workspace. */
export async function getBatch(scope: DataScope, batchId: string): Promise<{ batch: Batch; projects: Project[] }> {
  const row = await getBatchRow(scope, batchId);
  const list = await listProjectsOfBatch(scope, batchId);
  const status = batchStatusOf(list.map((p) => p.status));
  return { batch: { id: row.id, name: row.name, status, createdAt: row.createdAt.toISOString(), projectIds: list.map((p) => p.id) }, projects: list };
}

export async function listBatches(scope: DataScope, limit = 50): Promise<Batch[]> {
  const rows = await db().select().from(projectBatches).where(eq(projectBatches.workspaceId, scope.workspaceId)).orderBy(desc(projectBatches.createdAt)).limit(limit);
  if (rows.length === 0) return [];
  const members = await db().select({ id: projects.id, batchId: projects.batchId, status: projects.status }).from(projects).where(inArray(projects.batchId, rows.map((r) => r.id)));
  return rows.map((r) => {
    const mine = members.filter((m) => m.batchId === r.id);
    return { id: r.id, name: r.name, status: batchStatusOf(mine.map((m) => m.status)), createdAt: r.createdAt.toISOString(), projectIds: mine.map((m) => m.id) };
  });
}

/** Informational: a variant's input as stored (format or hook), for the batch page. */
export function variantOf(input: AdInput) {
  return { format: input.format, hook: input.hook };
}
