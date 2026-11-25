import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { creditLedger, db, enhanceJobs } from "@/lib/db";
import { getCreditBalance, CreditError } from "@/lib/credits";
import { copyObject, deleteObject, isStagedPathOf, safeFileName, signedDownloadUrl } from "@/lib/storage";
import { costLimits } from "@/lib/services/costGuard";
import { inngest, enhanceRequested } from "@/lib/inngest/client";
import { DataError } from "@/lib/data/errors";
import type { DataScope } from "@/lib/data/server";
import { IMAGE_TARGETS, IMAGE_TYPES, VIDEO_TARGETS, VIDEO_TYPES, imageCredits, maxVideoSeconds, videoCredits, type EnhanceKind, type EnhanceTarget } from "@/lib/enhanceRules";

/**
 * The enhancer's data (25 Nov 2026): create a job from a staged upload, list and read jobs, and the
 * credit rows of a job. Every read and write is scoped to the workspace; someone else's job is "not found".
 */
export type EnhanceJobRow = typeof enhanceJobs.$inferSelect;

export type ClientEnhanceJob = {
  id: string;
  kind: EnhanceKind;
  status: "queued" | "processing" | "completed" | "failed";
  target: EnhanceTarget;
  fileName: string;
  sourceUrl?: string;
  resultUrl?: string;
  width?: number;
  height?: number;
  outWidth?: number;
  outHeight?: number;
  seconds?: number;
  credits?: number;
  error?: string;
  createdAt: string;
  finishedAt?: string;
};

export type EnhanceLimits = { maxSeconds: Record<string, number>; maxSecondsHighFps: Record<string, number> };

/** How long a video may be per target, from the cost guard's limit per action (server-only setting). */
export function enhanceLimits(): EnhanceLimits {
  const max = costLimits().maxPerActionUsd;
  return {
    maxSeconds: Object.fromEntries(VIDEO_TARGETS.map((t) => [t.key, maxVideoSeconds(max, t.key)])),
    maxSecondsHighFps: Object.fromEntries(VIDEO_TARGETS.map((t) => [t.key, maxVideoSeconds(max, t.key, true)])),
  };
}

export async function toClientJob(row: EnhanceJobRow): Promise<ClientEnhanceJob> {
  const [sourceUrl, resultUrl] = await Promise.all([
    signedDownloadUrl(row.sourcePath, 3600).catch(() => undefined),
    row.status === "completed" && row.resultPath ? signedDownloadUrl(row.resultPath, 3600).catch(() => undefined) : undefined,
  ]);
  return {
    id: row.id,
    kind: row.kind as EnhanceKind,
    status: row.status as ClientEnhanceJob["status"],
    target: row.target as EnhanceTarget,
    fileName: row.fileName,
    sourceUrl,
    resultUrl,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    outWidth: row.outWidth ?? undefined,
    outHeight: row.outHeight ?? undefined,
    seconds: row.seconds ?? undefined,
    credits: row.credits ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
  };
}

export async function listEnhanceJobs(scope: DataScope, limit = 30) {
  const rows = await db().select().from(enhanceJobs).where(eq(enhanceJobs.workspaceId, scope.workspaceId)).orderBy(desc(enhanceJobs.createdAt)).limit(limit);
  return Promise.all(rows.map(toClientJob));
}

export async function getEnhanceJobRow(scope: DataScope, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db().select().from(enhanceJobs).where(and(eq(enhanceJobs.id, id), eq(enhanceJobs.workspaceId, scope.workspaceId))).limit(1);
  return row ?? null;
}

export type NewEnhanceJob = { kind: EnhanceKind; target: EnhanceTarget; stagedPath: string; fileName: string; mime?: string; rightsConfirmed: boolean; seconds?: number };

/**
 * Creates a job from a staged upload and starts it. The credits are only an early check here (from the
 * length the browser read); the job measures the file itself and reserves the real amount before the paid call.
 */
export async function createEnhanceJob(scope: DataScope, input: NewEnhanceJob) {
  if (scope.readOnly) throw new DataError("Nothing can be changed while viewing as a customer.", 403, "read_only_view");
  if (!input.rightsConfirmed) throw new DataError("Confirm that you own this file or may use it.", 400, "rights_required");
  if (!isStagedPathOf(input.stagedPath, scope.userId)) throw new DataError("Upload the file again.", 400, "bad_path");
  const targets = input.kind === "video" ? VIDEO_TARGETS.map((t) => t.key) : IMAGE_TARGETS.map((t) => t.key);
  if (!(targets as string[]).includes(input.target)) throw new DataError("Pick a size.", 400, "bad_target");
  const types: readonly string[] = input.kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  if (input.mime && !types.includes(input.mime)) throw new DataError(input.kind === "video" ? "Use an MP4, MOV or WebM video." : "Use a JPG, PNG or WebP image.", 415, "bad_type");
  if (input.kind === "video" && input.seconds) {
    const max = enhanceLimits().maxSeconds[input.target] ?? 0;
    if (input.seconds > max + 0.5) throw new DataError(`At ${input.target === "4k" ? "4K" : "1080p"} a video can be up to ${max} seconds. Trim it first, or pick ${input.target === "4k" ? "1080p" : "a shorter video"}.`, 400, "too_long");
  }
  const early = input.kind === "video" ? videoCredits(input.seconds ?? 10, input.target as "1080p" | "4k") : imageCredits();
  const balance = await getCreditBalance(scope.workspaceId);
  if (balance < early) throw new CreditError(`This needs about ${early} credits and the workspace has ${balance}. Add credits in Billing to start it.`);

  const [row] = await db()
    .insert(enhanceJobs)
    .values({ userId: scope.userId, workspaceId: scope.workspaceId, kind: input.kind, target: input.target, fileName: input.fileName.slice(0, 200), sourcePath: input.stagedPath, sourceMime: input.mime ?? null, seconds: input.seconds ?? null, rightsConfirmedAt: new Date() })
    .returning();
  // The staged file moves into the job's own folder (staged files are cleaned up separately).
  const to = `users/${scope.userId}/enhance/${row.id}/source-${safeFileName(input.fileName)}`;
  await copyObject(input.stagedPath, to);
  await deleteObject(input.stagedPath).catch(() => null);
  await db().update(enhanceJobs).set({ sourcePath: to, updatedAt: new Date() }).where(eq(enhanceJobs.id, row.id));
  try {
    await inngest.send(enhanceRequested.create({ jobId: row.id }));
  } catch {
    await db().update(enhanceJobs).set({ status: "failed", error: "The job system could not be reached. Nothing was charged; try again in a minute.", updatedAt: new Date() }).where(eq(enhanceJobs.id, row.id));
    throw new DataError("The job system could not be reached. Nothing was charged; try again in a minute.", 503, "jobs_unavailable");
  }
  return row.id;
}

/* ---------- credits of a job (ledger references keep each row once) ---------- */

/** Reserves the measured credits; throws CreditError when the balance is too low. Idempotent per job. */
export async function reserveEnhanceCredits(job: EnhanceJobRow, credits: number) {
  const reference = `enhance:${job.id}:reserve`;
  const [twin] = await db().select({ id: creditLedger.id }).from(creditLedger).where(and(eq(creditLedger.userId, job.userId), eq(creditLedger.reference, reference))).limit(1);
  if (twin) return;
  const balance = await getCreditBalance(job.workspaceId);
  if (balance < credits) throw new CreditError(`This needs ${credits} credits and the workspace has ${balance}. Add credits in Billing and try again.`);
  await db().insert(creditLedger).values({ userId: job.userId, workspaceId: job.workspaceId, credits: -credits, kind: "reserve", note: `Enhance ${job.kind}: ${job.fileName}`, reference }).onConflictDoNothing();
}

/** Gives the reserved credits back after a failure (once). */
export async function refundEnhanceCredits(job: EnhanceJobRow) {
  const [reserve] = await db().select().from(creditLedger).where(and(eq(creditLedger.userId, job.userId), eq(creditLedger.reference, `enhance:${job.id}:reserve`))).limit(1);
  if (!reserve) return;
  await db().insert(creditLedger).values({ userId: job.userId, workspaceId: job.workspaceId, credits: -reserve.credits, kind: "refund", note: `Enhance ${job.kind} failed: ${job.fileName}`, reference: `enhance:${job.id}:refund` }).onConflictDoNothing();
}
