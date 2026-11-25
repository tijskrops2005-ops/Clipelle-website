import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { creditLedger, db, enhanceJobs } from "@/lib/db";
import { getCreditBalance, CreditError } from "@/lib/credits";
import { copyObject, deleteObject, isStagedPathOf, safeFileName, signedDownloadUrl } from "@/lib/storage";
import { costLimits } from "@/lib/services/costGuard";
import { inngest, enhanceRequested, mediaToolRequested } from "@/lib/inngest/client";
import { DataError } from "@/lib/data/errors";
import { resultStoragePath, type DataScope } from "@/lib/data/server";
import { IMAGE_TARGETS, IMAGE_TYPES, VIDEO_TARGETS, VIDEO_TYPES, imageCredits, maxVideoSeconds, videoCredits, type EnhanceKind, type EnhanceTarget } from "@/lib/enhanceRules";
import { MEDIA_MAX_SECONDS, MEDIA_TOOLS, mediaCredits, normaliseOptions, type MediaToolKey, type MediaToolOptions } from "@/lib/mediaTools";

/**
 * The enhancer's data (25 Nov 2026): create a job from a staged upload, list and read jobs, and the
 * credit rows of a job. Every read and write is scoped to the workspace; someone else's job is "not found".
 */
export type EnhanceJobRow = typeof enhanceJobs.$inferSelect;

export type ClientEnhanceJob = {
  id: string;
  kind: EnhanceKind | MediaToolKey;
  status: "queued" | "processing" | "completed" | "failed";
  target: EnhanceTarget | "-";
  options?: MediaToolOptions;
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
    kind: row.kind as ClientEnhanceJob["kind"],
    status: row.status as ClientEnhanceJob["status"],
    target: row.target as ClientEnhanceJob["target"],
    options: row.options ?? undefined,
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
  const rows = await db().select().from(enhanceJobs).where(and(eq(enhanceJobs.workspaceId, scope.workspaceId), inArray(enhanceJobs.kind, ["video", "image"]))).orderBy(desc(enhanceJobs.createdAt)).limit(limit);
  return Promise.all(rows.map(toClientJob));
}

/** The jobs of one media tool, newest first. */
export async function listToolJobs(scope: DataScope, tool: MediaToolKey, limit = 30) {
  const rows = await db().select().from(enhanceJobs).where(and(eq(enhanceJobs.workspaceId, scope.workspaceId), eq(enhanceJobs.kind, tool))).orderBy(desc(enhanceJobs.createdAt)).limit(limit);
  return Promise.all(rows.map(toClientJob));
}

export type NewToolJob = { tool: MediaToolKey; stagedPath?: string; from?: string; fileName?: string; mime?: string; rightsConfirmed: boolean; seconds?: number; options?: MediaToolOptions };

/** Starts a media tool job from a staged upload (same checks as the enhancer; credits are reserved by the job once the file is measured). */
export async function createToolJob(scope: DataScope, input: NewToolJob) {
  if (scope.readOnly) throw new DataError("Nothing can be changed while viewing as a customer.", 403, "read_only_view");
  if (!input.rightsConfirmed) throw new DataError("Confirm that you own this file or may use it.", 400, "rights_required");
  const tool = MEDIA_TOOLS[input.tool];
  const source = input.from ? await sourceOrThrow(scope, input.from, tool.media) : null;
  if (!source && !(input.stagedPath && isStagedPathOf(input.stagedPath, scope.userId))) throw new DataError("Upload the file again.", 400, "bad_path");
  if (source) input = { ...input, fileName: source.fileName, mime: source.mime, seconds: source.seconds ?? input.seconds };
  const fileName = input.fileName ?? "file";
  const types: readonly string[] = tool.media === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  if (input.mime && !types.includes(input.mime)) throw new DataError(tool.media === "video" ? "Use an MP4, MOV or WebM video." : "Use a JPG, PNG or WebP image.", 415, "bad_type");
  if (tool.media === "video" && input.seconds && input.seconds > MEDIA_MAX_SECONDS + 0.5) throw new DataError(`A video can be up to ${MEDIA_MAX_SECONDS / 60} minutes here. Trim it first.`, 400, "too_long");
  const early = mediaCredits(input.tool, input.seconds ?? 10);
  const balance = await getCreditBalance(scope.workspaceId);
  if (balance < early) throw new CreditError(`This needs about ${early} credits and the workspace has ${balance}. Add credits in Billing to start it.`);
  const [row] = await db()
    .insert(enhanceJobs)
    .values({ userId: scope.userId, workspaceId: scope.workspaceId, kind: input.tool, target: "-", options: normaliseOptions(input.tool, input.options), fileName: fileName.slice(0, 200), sourcePath: source?.path ?? input.stagedPath!, sourceMime: input.mime ?? null, seconds: input.seconds ?? null, rightsConfirmedAt: new Date() })
    .returning();
  await placeSource(scope, row.id, "tools", { stagedPath: input.stagedPath, from: source ?? undefined, fileName });
  try {
    await inngest.send(mediaToolRequested.create({ jobId: row.id }));
  } catch {
    await db().update(enhanceJobs).set({ status: "failed", error: "The job system could not be reached. Nothing was charged; try again in a minute.", updatedAt: new Date() }).where(eq(enhanceJobs.id, row.id));
    throw new DataError("The job system could not be reached. Nothing was charged; try again in a minute.", 503, "jobs_unavailable");
  }
  return row.id;
}

async function sourceOrThrow(scope: DataScope, from: string, media: "video" | "image") {
  const ref = parseFrom(from);
  const source = ref ? await resolveSource(scope, ref) : null;
  if (!source) throw new DataError("That file is not available any more. Upload it instead.", 404, "source_missing");
  if (source.media !== media) throw new DataError(media === "video" ? "This tool needs a video." : "This tool needs an image.", 400, "wrong_media");
  return source;
}

/** The ledger note for a job: the tool's name, or "Enhance video/image". */
function jobLabel(job: EnhanceJobRow) {
  return job.kind === "video" || job.kind === "image" ? `Enhance ${job.kind}` : MEDIA_TOOLS[job.kind as MediaToolKey]?.label ?? job.kind;
}

export async function getEnhanceJobRow(scope: DataScope, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db().select().from(enhanceJobs).where(and(eq(enhanceJobs.id, id), eq(enhanceJobs.workspaceId, scope.workspaceId))).limit(1);
  return row ?? null;
}

/* ---------- a source that is already stored (25 Nov 2026: tools linked together) ---------- */

export type SourceRef = { kind: "job"; id: string } | { kind: "project"; id: string; language?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "job:<id>", "project:<id>" or "project:<id>:<language>" → a reference, or null. */
export function parseFrom(from: string | null | undefined): SourceRef | null {
  const [kind, id, language] = (from ?? "").split(":");
  if (!UUID.test(id ?? "")) return null;
  if (kind === "job") return { kind: "job", id };
  if (kind === "project") return { kind: "project", id, language: language && /^[A-Za-z-]{2,12}$/.test(language) ? language : undefined };
  return null;
}

export type ResolvedSource = { path: string; fileName: string; mime: string; media: "video" | "image"; seconds: number | null; width: number | null; height: number | null };

/** A finished file of this workspace (a tool result or a project's video) as the source of a new job; null when not found or not ready. */
export async function resolveSource(scope: DataScope, ref: SourceRef): Promise<ResolvedSource | null> {
  if (ref.kind === "job") {
    const row = await getEnhanceJobRow(scope, ref.id);
    if (!row || row.status !== "completed" || !row.resultPath) return null;
    const mime = row.resultMime ?? (row.resultPath.endsWith(".mp4") ? "video/mp4" : "image/png");
    const ext = row.resultPath.split(".").pop() ?? "mp4";
    return { path: row.resultPath, fileName: `${row.fileName.replace(/\.[^.]+$/, "")}-result.${ext}`, mime, media: mime.startsWith("image/") ? "image" : "video", seconds: row.seconds ?? null, width: row.outWidth ?? row.width ?? null, height: row.outHeight ?? row.height ?? null };
  }
  const r = await resultStoragePath(ref.id, scope, ref.language);
  if (!r) return null;
  return { path: r.path, fileName: `${r.name}.mp4`, mime: "video/mp4", media: "video", seconds: r.seconds, width: r.width, height: r.height };
}

/** Copies the chosen source into the job's folder: a staged upload moves, a stored result is copied. */
async function placeSource(scope: DataScope, jobId: string, folder: "enhance" | "tools", input: { stagedPath?: string; from?: ResolvedSource; fileName: string }) {
  const to = `users/${scope.userId}/${folder}/${jobId}/source-${safeFileName(input.fileName)}`;
  if (input.from) {
    await copyObject(input.from.path, to);
  } else {
    await copyObject(input.stagedPath!, to);
    await deleteObject(input.stagedPath!).catch(() => null);
  }
  await db().update(enhanceJobs).set({ sourcePath: to, updatedAt: new Date() }).where(eq(enhanceJobs.id, jobId));
}

export type NewEnhanceJob = { kind: EnhanceKind; target: EnhanceTarget; stagedPath?: string; from?: string; fileName?: string; mime?: string; rightsConfirmed: boolean; seconds?: number };

/**
 * Creates a job from a staged upload and starts it. The credits are only an early check here (from the
 * length the browser read); the job measures the file itself and reserves the real amount before the paid call.
 */
export async function createEnhanceJob(scope: DataScope, input: NewEnhanceJob) {
  if (scope.readOnly) throw new DataError("Nothing can be changed while viewing as a customer.", 403, "read_only_view");
  if (!input.rightsConfirmed) throw new DataError("Confirm that you own this file or may use it.", 400, "rights_required");
  const source = input.from ? await sourceOrThrow(scope, input.from, input.kind) : null;
  if (!source && !(input.stagedPath && isStagedPathOf(input.stagedPath, scope.userId))) throw new DataError("Upload the file again.", 400, "bad_path");
  if (source) {
    input = { ...input, fileName: source.fileName, mime: source.mime, seconds: source.seconds ?? input.seconds };
  }
  const fileName = input.fileName ?? "file";
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
    .values({ userId: scope.userId, workspaceId: scope.workspaceId, kind: input.kind, target: input.target, fileName: fileName.slice(0, 200), sourcePath: source?.path ?? input.stagedPath!, sourceMime: input.mime ?? null, seconds: input.seconds ?? null, rightsConfirmedAt: new Date() })
    .returning();
  await placeSource(scope, row.id, "enhance", { stagedPath: input.stagedPath, from: source ?? undefined, fileName });
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
  await db().insert(creditLedger).values({ userId: job.userId, workspaceId: job.workspaceId, credits: -credits, kind: "reserve", note: `${jobLabel(job)}: ${job.fileName}`, reference }).onConflictDoNothing();
}

/** Gives the reserved credits back after a failure (once). */
export async function refundEnhanceCredits(job: EnhanceJobRow) {
  const [reserve] = await db().select().from(creditLedger).where(and(eq(creditLedger.userId, job.userId), eq(creditLedger.reference, `enhance:${job.id}:reserve`))).limit(1);
  if (!reserve) return;
  await db().insert(creditLedger).values({ userId: job.userId, workspaceId: job.workspaceId, credits: -reserve.credits, kind: "refund", note: `${jobLabel(job)} failed: ${job.fileName}`, reference: `enhance:${job.id}:refund` }).onConflictDoNothing();
}
