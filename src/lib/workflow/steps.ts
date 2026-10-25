import "server-only";
import { and, eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { assets, db, projects, steps, type AssetRow, type ProjectRow, type StepRow } from "@/lib/db";
import { copyFromUrl, objectPath, putObject, signedDownloadUrl } from "@/lib/storage";
import { CostGuardError, getProjectSpend } from "@/lib/services/costGuard";
import { settleCredits } from "@/lib/credits";
import { creditsForSpend } from "@/lib/plans";
import { TimeoutError, withTimeout } from "@/lib/timeout";
import { inngest, providerJobFinished } from "@/lib/inngest/client";

/**
 * Shared helpers for the orchestrators (src/lib/inngest/functions/*Workflow.ts).
 *
 * Every pipeline step follows the same pattern:
 *   1. skip when the database says it is already completed (idempotent, so a retry
 *      resumes where it stopped);
 *   2. mark processing; call the provider inside withRetries() for transient errors;
 *   3. copy every result into our storage; mark completed with the result pointers;
 *   4. on a final error: mark the step and the project failed with a plain-language
 *      message and stop the run (NonRetriableError). The user retries from the UI.
 */

export class StepFailure extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "StepFailure";
  }
}

export async function loadProject(projectId: string): Promise<ProjectRow> {
  const [row] = await db().select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!row) throw new NonRetriableError(`Project ${projectId} not found.`);
  return row;
}

export async function loadStep(projectId: string, key: string): Promise<StepRow> {
  const [row] = await db().select().from(steps).where(and(eq(steps.projectId, projectId), eq(steps.key, key))).limit(1);
  if (!row) throw new NonRetriableError(`Step ${key} of project ${projectId} not found.`);
  return row;
}

export async function markProcessing(projectId: string, key: string) {
  const step = await loadStep(projectId, key);
  if (step.status === "processing") return step;
  const [row] = await db()
    .update(steps)
    .set({ status: "processing", startedAt: new Date(), finishedAt: null, error: null, updatedAt: new Date() })
    .where(eq(steps.id, step.id))
    .returning();
  await db().update(projects).set({ status: "processing", updatedAt: new Date() }).where(eq(projects.id, projectId));
  return row;
}

export async function markCompleted(projectId: string, key: string, patch: { output?: Record<string, unknown>; externalJobId?: string; costUsd?: number } = {}) {
  const step = await loadStep(projectId, key);
  await db()
    .update(steps)
    .set({
      status: "completed",
      finishedAt: new Date(),
      error: null,
      output: patch.output ?? step.output,
      externalJobId: patch.externalJobId ?? step.externalJobId,
      costUsd: patch.costUsd ?? step.costUsd,
      updatedAt: new Date(),
    })
    .where(eq(steps.id, step.id));
}

export async function markWaitingForUser(projectId: string, key: string) {
  await db().update(steps).set({ status: "needs_input", startedAt: new Date(), updatedAt: new Date() }).where(and(eq(steps.projectId, projectId), eq(steps.key, key)));
  await db().update(projects).set({ status: "review", updatedAt: new Date() }).where(eq(projects.id, projectId));
}

/** Records the failure for the user and stops the run. Never throws away the message. */
export async function failStep(projectId: string, key: string, error: unknown): Promise<never> {
  const message = plainMessage(error);
  await db()
    .update(steps)
    .set({ status: "failed", finishedAt: new Date(), error: message, updatedAt: new Date() })
    .where(and(eq(steps.projectId, projectId), eq(steps.key, key)));
  await db().update(projects).set({ status: "failed", updatedAt: new Date() }).where(eq(projects.id, projectId));
  await refundCredits(projectId);
  await afterProjectEnd(projectId);
  throw new NonRetriableError(`${key}: ${message}`, { cause: error instanceof Error ? error : undefined });
}

/** A message a customer can act on, without stack traces or provider jargon where avoidable. */
export function plainMessage(error: unknown): string {
  if (error instanceof StepFailure) return error.message;
  if (error instanceof CostGuardError) return `Paused by the spending guard: ${error.message}`;
  if (error instanceof Error) return error.message.slice(0, 500);
  return "Something went wrong in this step. Retry it; if it keeps failing, contact support.";
}

/** Errors worth a second try: network hiccups, rate limits, 5xx. Not: bad input, no credit, cost guard. */
export function isTransient(error: unknown) {
  if (error instanceof CostGuardError || error instanceof StepFailure || error instanceof NonRetriableError) return false;
  const e = error as { status?: number; code?: string; message?: string };
  if (typeof e?.status === "number") return e.status === 408 || e.status === 429 || e.status >= 500;
  const text = `${e?.code ?? ""} ${e?.message ?? ""}`.toLowerCase();
  return /timeout|timed out|econnreset|enotfound|network|fetch failed|socket|rate limit/.test(text);
}

/**
 * A hard deadline for one pipeline step (2026-10-19): a step that waits on a stuck database
 * connection or a provider that never answers would otherwise sit on "Processing" forever.
 * On timeout the caller's failStep() puts the step on "Failed" with this plain message.
 */
export function withDeadline<T>(label: string, minutes: number, work: () => Promise<T>): Promise<T> {
  return withTimeout(minutes * 60_000, `${label} took longer than ${minutes} minutes and was stopped. Retry the step; if it happens again, check the service status.`, work).catch((error) => {
    if (error instanceof TimeoutError) throw new StepFailure(error.message, error);
    throw error;
  });
}

/** Up to `attempts` tries with backoff for transient errors; other errors surface immediately. */
export async function withRetries<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isTransient(error) || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
    }
  }
  throw new StepFailure(`${label} failed: ${plainMessage(last)}`, last);
}

/* ---------- waiting on a provider: webhook first, polling as the fallback ---------- */

type StepTools = Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"];

/**
 * Replaces a plain sleep between two status checks: the run sleeps at most `seconds`, but wakes
 * at once when the provider's webhook (src/lib/webhooks/incoming.ts) reports the job. Either way
 * the caller checks the status through the provider API next, so a webhook is never trusted alone.
 */
export async function waitForJob(step: StepTools, id: string, provider: "heygen" | "fal" | "shotstack", externalJobId: string, seconds: number) {
  const safeId = externalJobId.replace(/[^A-Za-z0-9_-]/g, "");
  await step.waitForEvent(id, { event: providerJobFinished, timeout: `${seconds}s`, if: `async.data.provider == "${provider}" && async.data.externalJobId == "${safeId}"` });
}

/* ---------- assets ---------- */

/** Copies a provider result into our storage and records it. The provider URL is forgotten. */
export async function storeFromUrl(input: {
  projectId: string;
  stepId?: string;
  kind: AssetRow["kind"];
  url: string;
  fileName: string;
  language?: string;
  seconds?: number;
  width?: number;
  height?: number;
  fallbackMime?: string;
}): Promise<AssetRow> {
  const path = objectPath({ projectId: input.projectId, kind: input.kind, fileName: input.fileName, language: input.language });
  const stored = await withRetries("Copying the result to storage", () => copyFromUrl(input.url, path, input.fallbackMime));
  const userId = await ownerOf(input.projectId);
  const [row] = await db()
    .insert(assets)
    .values({
      projectId: input.projectId,
      stepId: input.stepId,
      userId,
      kind: input.kind,
      language: input.language,
      storagePath: stored.path,
      mime: stored.mime,
      bytes: stored.bytes,
      seconds: input.seconds,
      width: input.width,
      height: input.height,
    })
    .returning();
  return row;
}

/** Stores bytes we produced ourselves (a script JSON, a prepared image, an SRT). */
export async function storeBytes(input: {
  projectId: string;
  stepId?: string;
  kind: AssetRow["kind"];
  data: Uint8Array | Blob;
  mime: string;
  fileName: string;
  language?: string;
  seconds?: number;
}): Promise<AssetRow> {
  const path = objectPath({ projectId: input.projectId, kind: input.kind, fileName: input.fileName, language: input.language });
  const stored = await putObject(path, input.data, input.mime);
  const userId = await ownerOf(input.projectId);
  const [row] = await db()
    .insert(assets)
    .values({ projectId: input.projectId, stepId: input.stepId, userId, kind: input.kind, language: input.language, storagePath: stored.path, mime: stored.mime, bytes: stored.bytes, seconds: input.seconds })
    .returning();
  return row;
}

/** The account that owns a project, copied onto every asset row so rows can be checked on their own. */
async function ownerOf(projectId: string) {
  const [p] = await db().select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  return p?.ownerId ?? null;
}

export async function loadAsset(id: string): Promise<AssetRow> {
  const [row] = await db().select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!row) throw new StepFailure("A file this step needs is missing from storage. Retry the previous step.");
  return row;
}

/** A URL a provider can fetch for the next few hours. */
export async function providerUrl(asset: AssetRow, hours = 6) {
  return signedDownloadUrl(asset.storagePath, hours * 3600);
}

export async function downloadAsset(asset: AssetRow): Promise<Uint8Array> {
  const url = await providerUrl(asset, 1);
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new StepFailure(`Could not read ${asset.kind} from storage (${res.status}).`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function setProjectFinal(projectId: string, assetId: string) {
  await db().update(projects).set({ status: "completed", finalAssetId: assetId, updatedAt: new Date() }).where(eq(projects.id, projectId));
  await settleProjectCredits(projectId);
  await afterProjectEnd(projectId);
}

/**
 * After a project reaches completed or failed (2026-10-21): keep its batch's status current.
 * Never throws: a bookkeeping problem must not undo a finished video.
 */
export async function afterProjectEnd(projectId: string) {
  try {
    const [p] = await db().select({ batchId: projects.batchId }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (p?.batchId) {
      const { refreshBatchStatus } = await import("@/lib/batches");
      const result = await refreshBatchStatus(p.batchId);
      if (result?.justFinished) {
        const { notifyBatchEnd } = await import("@/lib/notifications");
        await notifyBatchEnd(p.batchId);
      }
    } else {
      const { notifyProjectEnd } = await import("@/lib/notifications");
      await notifyProjectEnd(projectId);
    }
    const [row] = await db().select({ status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (row?.status === "completed" || row?.status === "failed") {
      const { enqueueProjectEvent } = await import("@/lib/webhooks/outgoing");
      await enqueueProjectEvent(projectId, row.status);
    }
  } catch (error) {
    console.error("[batch] status refresh failed", error);
  }
}

/* ---------- credits (added 2026-10-21): settle what was really used, refund a failed project ---------- */

/** On completion: the reservation is settled against the real spend converted to credits; the rest comes back. */
export async function settleProjectCredits(projectId: string) {
  try {
    const spend = await getProjectSpend(projectId);
    const [row] = await db().select({ workflow: projects.workflow }).from(projects).where(eq(projects.id, projectId)).limit(1);
    const used = spend.totalUsd > 0 ? creditsForSpend(spend.totalUsd, row?.workflow === "translate" ? "translate" : "ad") : 0;
    await settleCredits(projectId, used, "Settled against the real cost");
  } catch (error) {
    console.error("[credits] settle failed", error);
  }
}

/** On failure: the whole reservation is refunded (retries re-reserve nothing: the reserve row is reused). */
export async function refundCredits(projectId: string) {
  try {
    await settleCredits(projectId, 0, "Project failed");
  } catch (error) {
    console.error("[credits] refund failed", error);
  }
}
