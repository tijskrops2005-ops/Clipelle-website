import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { AdProject, LanguageCode, Project, Segment, Step, StepKey, TranslateProject, TranslateStepKey, TranslationQuality } from "@/lib/types";
import { assets, db, projects, steps, translations, type AdInput, type AssetRow, type ProjectRow, type StepRow, type TranslateInput, type TranslationRow } from "@/lib/db";
import { adProjectCreated, inngest, reviewApproved, stepRetry, translateProjectCreated } from "@/lib/inngest/client";
import { objectInfo, signedDownloadUrl } from "@/lib/storage";
import { rewriteSegmentsInAdTone } from "@/lib/services/adTone";
import { costGuardResponse, costLimits, creativeSpent, getProjectSpend, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { estimateAdCost, estimateTranslateCost } from "@/lib/pricing";
import { workflowSettings } from "@/lib/workflow/settings";

/**
 * Data access for real projects (database mode). The UI calls this through the routes in
 * src/app/api/projects; the orchestrator (src/lib/inngest/functions) writes the step rows.
 * The mock store in src/lib/mock offers the same operations for demo mode.
 */

export const AD_STEPS: StepKey[] = ["script", "productClip", "presenter", "finalEdit"];
export const TRANSLATE_STEPS: TranslateStepKey[] = ["upload", "translate", "review", "captions"];

export class DataError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = "bad_request") {
    super(message);
    this.name = "DataError";
  }
}

/* ---------- row → Project (what the screens render) ---------- */

function toStep(row: StepRow | undefined): Step {
  if (!row) return { status: "waiting" };
  return {
    status: row.status,
    startedAt: row.startedAt?.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    error: row.error ?? undefined,
    externalJobId: row.externalJobId ?? undefined,
    attempt: row.attempt,
  };
}

/** Signed URL (1 h) for an asset, or undefined. Provider URLs never reach the UI. */
async function urlFor(asset: AssetRow | undefined) {
  if (!asset) return undefined;
  try {
    return await signedDownloadUrl(asset.storagePath, 3600);
  } catch {
    return undefined;
  }
}

/** Estimate for one click, with the same numbers the forms show. */
export function estimateForProject(row: ProjectRow) {
  if (row.workflow === "ad") {
    return estimateAdCost({ seconds: workflowSettings.adSeconds, clipModel: workflowSettings.clipModel, engine: workflowSettings.heygenEngine }).total;
  }
  const input = row.input as TranslateInput;
  return estimateTranslateCost({ seconds: input.sourceSeconds, quality: input.quality, enhance: input.enhance, languages: input.targetLanguages.length, hasSourceTranscript: input.sourceLanguage !== "auto" }).perLanguageTotal;
}

async function toProject(row: ProjectRow, stepRows: StepRow[], translationRows: TranslationRow[], assetRows: AssetRow[]): Promise<Project> {
  const stepsByKey = new Map(stepRows.map((s) => [s.key, s]));
  const assetsById = new Map(assetRows.map((a) => [a.id, a]));
  const spend = await getProjectSpend(row.id);
  const budgetUsd = costLimits().maxPerCreativeUsd;
  const estimateUsd = estimateForProject(row);

  if (row.workflow === "ad") {
    const input = row.input as AdInput;
    const images = assetRows.filter((a) => a.kind === "image").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const imageUrls = (await Promise.all(images.map(urlFor))).filter((u): u is string => Boolean(u));
    const project: AdProject = {
      id: row.id,
      workflow: "ad",
      name: row.name,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      productName: input.productName,
      productUrl: input.productUrl,
      description: input.description,
      script: input.script,
      imageUrls,
      steps: Object.fromEntries(AD_STEPS.map((k) => [k, toStep(stepsByKey.get(k))])) as Record<StepKey, Step>,
      finalVideoUrl: row.finalAssetId ? await urlFor(assetsById.get(row.finalAssetId)) : undefined,
      spentUsd: spend.totalUsd,
      budgetUsd,
      estimateUsd,
    };
    return project;
  }

  const input = row.input as TranslateInput;
  const source = assetsById.get(input.sourceAssetId);
  const project: TranslateProject = {
    id: row.id,
    workflow: "translate",
    name: row.name,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    sourceFileName: input.sourceFileName,
    sourceSeconds: input.sourceSeconds,
    sourceVideoUrl: await urlFor(source),
    sourceLanguage: input.sourceLanguage,
    detectedLanguage: (row.detectedLanguage as LanguageCode | null) ?? undefined,
    targetLanguages: input.targetLanguages,
    quality: input.quality,
    rightsConfirmedAt: (row.rightsConfirmedAt ?? row.createdAt).toISOString(),
    steps: Object.fromEntries(TRANSLATE_STEPS.map((k) => [k, toStep(stepsByKey.get(k))])) as Record<TranslateStepKey, Step>,
    translations: await Promise.all(
      translationRows.map(async (t) => ({
        language: t.language,
        status: t.status,
        segments: t.segments,
        videoUrl: await urlFor(assetsById.get(t.captionedAssetId ?? t.enhancedAssetId ?? t.videoAssetId ?? "")),
        error: t.error ?? undefined,
        spentUsd: creativeSpent(spend, t.language, input.targetLanguages.length),
      })),
    ),
    spentUsd: spend.totalUsd,
    budgetUsd,
    estimateUsd,
  };
  return project;
}

async function loadRelated(projectIds: string[]) {
  if (projectIds.length === 0) return { stepRows: [], translationRows: [], assetRows: [] };
  const d = db();
  const [stepRows, translationRows, assetRows] = await Promise.all([
    d.select().from(steps).where(inArray(steps.projectId, projectIds)),
    d.select().from(translations).where(inArray(translations.projectId, projectIds)),
    d.select().from(assets).where(inArray(assets.projectId, projectIds)),
  ]);
  return { stepRows, translationRows, assetRows };
}

export async function listProjects(limit = 100): Promise<Project[]> {
  const rows = await db().select().from(projects).orderBy(desc(projects.createdAt)).limit(limit);
  const { stepRows, translationRows, assetRows } = await loadRelated(rows.map((r) => r.id));
  return Promise.all(
    rows.map((r) =>
      toProject(
        r,
        stepRows.filter((s) => s.projectId === r.id),
        translationRows.filter((t) => t.projectId === r.id),
        assetRows.filter((a) => a.projectId === r.id),
      ),
    ),
  );
}

export async function getProject(id: string): Promise<Project | null> {
  const [row] = await db().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!row) return null;
  const { stepRows, translationRows, assetRows } = await loadRelated([row.id]);
  return toProject(row, stepRows, translationRows, assetRows);
}

export async function getProjectRow(id: string) {
  const [row] = await db().select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ?? null;
}

/* ---------- creation: draft → upload assets → start ---------- */

export type NewAdProject = { name: string; productName: string; productUrl?: string; description: string; script?: string };
export type NewTranslateProject = {
  name: string;
  sourceFileName: string;
  sourceSeconds: number;
  sourceLanguage: LanguageCode | "auto";
  targetLanguages: LanguageCode[];
  quality: TranslationQuality;
  reviewBeforeRender: boolean;
  format: "original" | "9:16";
  enhance: boolean;
  rightsConfirmed: boolean;
};

/** Creates the project and its step rows in status draft. Files are attached next, then `startProject`. */
export async function createDraft(input: { workflow: "ad"; ad: NewAdProject } | { workflow: "translate"; translate: NewTranslateProject }) {
  const d = db();
  if (input.workflow === "ad") {
    const a = input.ad;
    const [row] = await d
      .insert(projects)
      .values({
        workflow: "ad",
        name: a.name,
        status: "draft",
        input: { productName: a.productName, productUrl: a.productUrl, description: a.description, script: a.script, imageAssetIds: [] } satisfies AdInput,
      })
      .returning();
    await d.insert(steps).values(AD_STEPS.map((key) => ({ projectId: row.id, key, status: "waiting" as const })));
    return row;
  }
  const t = input.translate;
  if (!t.rightsConfirmed) throw new DataError("Confirm the rights to the video first.", 400, "rights_required");
  const [row] = await d
    .insert(projects)
    .values({
      workflow: "translate",
      name: t.name,
      status: "draft",
      rightsConfirmedAt: new Date(),
      input: {
        sourceFileName: t.sourceFileName,
        sourceSeconds: t.sourceSeconds,
        sourceAssetId: "",
        sourceLanguage: t.sourceLanguage,
        targetLanguages: t.targetLanguages,
        quality: t.quality,
        reviewBeforeRender: t.reviewBeforeRender,
        format: t.format,
        enhance: t.enhance,
      } satisfies TranslateInput,
    })
    .returning();
  await d.insert(steps).values(TRANSLATE_STEPS.map((key) => ({ projectId: row.id, key, status: "waiting" as const })));
  await d.insert(translations).values(t.targetLanguages.map((language) => ({ projectId: row.id, language, status: "waiting" as const, segments: [] })));
  return row;
}

/** Registers an object the browser uploaded with a signed URL. Verifies it really exists. */
export async function attachUploadedAsset(projectId: string, file: { kind: "image" | "source"; storagePath: string; fileName: string; seconds?: number }) {
  const row = await getProjectRow(projectId);
  if (!row) throw new DataError("Project not found.", 404, "not_found");
  if (row.status !== "draft") throw new DataError("Files can only be added before the project starts.", 409, "not_draft");
  if (!file.storagePath.startsWith(`projects/${projectId}/`)) throw new DataError("File path does not belong to this project.", 400, "bad_path");
  const info = await objectInfo(file.storagePath);
  if (!info) throw new DataError("The uploaded file was not found in storage. Upload it again.", 400, "missing_object");
  const [asset] = await db()
    .insert(assets)
    .values({ projectId, kind: file.kind, storagePath: file.storagePath, mime: info.mime, bytes: info.bytes, seconds: file.seconds })
    .returning();
  if (row.workflow === "ad" && file.kind === "image") {
    const input = row.input as AdInput;
    await db().update(projects).set({ input: { ...input, imageAssetIds: [...input.imageAssetIds, asset.id] }, updatedAt: new Date() }).where(eq(projects.id, projectId));
  }
  if (row.workflow === "translate" && file.kind === "source") {
    const input = row.input as TranslateInput;
    await db().update(projects).set({ input: { ...input, sourceAssetId: asset.id }, updatedAt: new Date() }).where(eq(projects.id, projectId));
  }
  return asset;
}

/** Draft → processing and the workflow event. Idempotent: a second call returns the project unchanged (rule 4). */
export async function startProject(projectId: string) {
  const row = await getProjectRow(projectId);
  if (!row) throw new DataError("Project not found.", 404, "not_found");
  if (row.status !== "draft") return row;
  if (row.workflow === "ad" && (row.input as AdInput).imageAssetIds.length === 0) throw new DataError("Add at least one product image.", 400, "no_images");
  if (row.workflow === "translate" && !(row.input as TranslateInput).sourceAssetId) throw new DataError("Upload the video first.", 400, "no_source");

  // Budget check before anything is spent: the estimate for one creative must fit the budget.
  const budget = costLimits().maxPerCreativeUsd;
  const estimate = estimateForProject(row);
  if (estimate > budget) {
    const what = row.workflow === "translate" ? "per language version" : "for this video";
    throw new DataError(
      `This would cost about $${estimate.toFixed(2)} ${what}, above the budget of $${budget.toFixed(2)} per video. Choose cheaper options (shorter video, speed instead of precision, no enhancement) or raise MAX_COST_PER_CREATIVE_USD in .env.local.`,
      409,
      "creative_budget",
    );
  }

  const firstStep = row.workflow === "ad" ? "script" : "upload";
  await db().transaction(async (tx) => {
    await tx.update(projects).set({ status: "processing", updatedAt: new Date() }).where(eq(projects.id, projectId));
    await tx.update(steps).set({ status: "processing", startedAt: new Date(), attempt: 1, updatedAt: new Date() }).where(and(eq(steps.projectId, projectId), eq(steps.key, firstStep)));
  });
  await inngest.send(row.workflow === "ad" ? adProjectCreated.create({ projectId }) : translateProjectCreated.create({ projectId }));
  return (await getProjectRow(projectId))!;
}

/* ---------- review, approval, retry (workflow B and both) ---------- */

export async function saveReviewedSegments(projectId: string, language: LanguageCode, segments: Segment[]) {
  const row = await getProjectRow(projectId);
  if (!row || row.workflow !== "translate") throw new DataError("Project not found.", 404, "not_found");
  if (row.status !== "review") throw new DataError("This project is not waiting for review.", 409, "not_in_review");
  await db()
    .update(translations)
    .set({ segments, updatedAt: new Date() })
    .where(and(eq(translations.projectId, projectId), eq(translations.language, language)));
}

/** The user approved: review step done, project back to processing, and the waiting run is woken up. */
export async function approveReview(projectId: string) {
  const row = await getProjectRow(projectId);
  if (!row || row.workflow !== "translate") throw new DataError("Project not found.", 404, "not_found");
  if (row.status !== "review") return row; // already approved: idempotent
  await db().transaction(async (tx) => {
    await tx.update(projects).set({ status: "processing", updatedAt: new Date() }).where(eq(projects.id, projectId));
    await tx.update(steps).set({ status: "completed", finishedAt: new Date(), updatedAt: new Date() }).where(and(eq(steps.projectId, projectId), eq(steps.key, "review")));
  });
  await inngest.send(reviewApproved.create({ projectId }));
  return (await getProjectRow(projectId))!;
}

export async function retryStep(projectId: string, stepKey: string) {
  const row = await getProjectRow(projectId);
  if (!row) throw new DataError("Project not found.", 404, "not_found");
  const [step] = await db().select().from(steps).where(and(eq(steps.projectId, projectId), eq(steps.key, stepKey))).limit(1);
  if (!step) throw new DataError("Unknown step.", 404, "not_found");
  if (step.status !== "failed") throw new DataError("Only a failed step can be retried.", 409, "not_failed");
  await db().transaction(async (tx) => {
    await tx.update(projects).set({ status: "processing", updatedAt: new Date() }).where(eq(projects.id, projectId));
    await tx
      .update(steps)
      .set({ status: "processing", startedAt: new Date(), finishedAt: null, error: null, attempt: step.attempt + 1, updatedAt: new Date() })
      .where(eq(steps.id, step.id));
  });
  await inngest.send(stepRetry.create({ projectId, stepKey }));
}

/** Claude rewrite for the review screen (database mode). Paid (cents), through the cost guard with the project id. */
export async function rewriteForProject(projectId: string, language: LanguageCode, segments: Segment[]) {
  const row = await getProjectRow(projectId);
  if (!row || row.workflow !== "translate") throw new DataError("Project not found.", 404, "not_found");
  const estimate = 0.01;
  const reserved = await reserveSpend({
    service: "anthropic",
    action: "translate_rewrite",
    estimatedUsd: estimate,
    fingerprintInput: { projectId, language, text: segments.map((s) => s.text) },
    projectId,
    language,
    languageCount: (row.input as TranslateInput).targetLanguages.length,
  });
  try {
    const result = await rewriteSegmentsInAdTone({ segments: segments.map((s) => ({ index: s.index, start: s.start, end: s.end, original: s.original, text: s.text })), language });
    await settleSpend(reserved.entryId, { status: "completed", actualUsd: result.costUsd });
    return segments.map((s, i) => ({ ...s, text: result.segments[i]?.text ?? s.text }));
  } catch (error) {
    await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
    throw error;
  }
}

/** Maps DataError / CostGuardError to a JSON response. */
export function dataErrorResponse(error: unknown): Response {
  const guard = costGuardResponse(error);
  if (guard) return guard;
  if (error instanceof DataError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  const e = error as { message?: string; status?: number };
  return Response.json({ error: e?.message ?? "Unexpected error." }, { status: typeof e?.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 500 });
}
