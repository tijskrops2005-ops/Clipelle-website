import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { AdProject, LanguageCode, Project, Step, StepKey, TranslateProject, TranslateStepKey, TranslationQuality } from "@/lib/types";
import { assets, db, projects, steps, translations, type AdInput, type AssetRow, type ProjectRow, type StepRow, type TranslateInput, type TranslationRow } from "@/lib/db";
import { adProjectCreated, adScriptApproved, inngest, stepRetry, translateProjectCreated } from "@/lib/inngest/client";
import { applyScriptReview, countWords, normaliseHooks, type AdScript } from "@/lib/services/script";
import { maxSpokenWords } from "@/lib/pricing";
import { objectInfo, signedDownloadUrl } from "@/lib/storage";
import { checkUserLimits, costGuardResponse, costLimits, creativeSpent, getProjectSpend } from "@/lib/services/costGuard";
import { estimateAdCost, estimateTranslateCost } from "@/lib/pricing";
import { workflowSettings } from "@/lib/workflow/settings";
import { DEFAULT_TONE, isAdTone, type AdTone } from "@/lib/adOptions";
import { DEFAULT_SPEED, isSpeedKey, speedValue, type AdLanguageCode, type SpeedKey } from "@/lib/voiceOptions";
import type { UploadKind } from "@/lib/data/uploads";
import { authErrorResponse } from "@/lib/auth";

/**
 * Data access for real projects (database mode). The UI calls this through the routes in
 * src/app/api/projects; the orchestrator (src/lib/inngest/functions) writes the step rows.
 * The mock store in src/lib/mock offers the same operations for demo mode.
 */

export const AD_STEPS: StepKey[] = ["script", "productClip", "presenter", "finalEdit"];
export const TRANSLATE_STEPS: TranslateStepKey[] = ["upload", "translate", "captions"];

export class DataError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = "bad_request", cause?: unknown) {
    super(message, cause instanceof Error ? { cause } : undefined);
    this.name = "DataError";
  }
}

/* ---------- row → Project (what the screens render) ---------- */

/** The script step's output as the review screen needs it (hooks, text, limit). */
function generatedScriptOf(step: StepRow | undefined, seconds: number) {
  const script = step?.output?.script as AdScript | undefined;
  if (!script) return undefined;
  const hooks = (script.hooks?.length ? script.hooks : [script.hook]).map((h) => ({ spoken: h.spoken }));
  return { hooks, presenterScript: script.presenterScript, maxWords: maxSpokenWords(seconds) };
}

function toStep(row: StepRow | undefined): Step {
  if (!row) return { status: "waiting" };
  return {
    status: row.status,
    startedAt: row.startedAt?.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    error: row.error ?? undefined,
    warning: typeof row.output?.warning === "string" ? row.output.warning : undefined,
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
    const input = row.input as AdInput;
    return estimateAdCost({ seconds: input.seconds ?? workflowSettings.adSeconds, clipModel: workflowSettings.clipModel, engine: input.engine ?? workflowSettings.heygenEngine, speed: speedValue(input.speed) }).total;
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
      seconds: input.seconds ?? workflowSettings.adSeconds,
      engine: input.engine ?? workflowSettings.heygenEngine,
      lookId: input.lookId,
      language: input.language ?? "en",
      accent: input.accent,
      voiceId: input.voiceId,
      speed: isSpeedKey(input.speed) ? input.speed : DEFAULT_SPEED,
      offer: input.offer,
      direction: input.direction,
      tone: input.tone && isAdTone(input.tone) ? input.tone : DEFAULT_TONE,
      background: input.background?.type === "color" ? input.background : input.background?.type === "image" ? { type: "image", url: await urlFor(assetsById.get(input.background.assetId)) } : undefined,
      brand: input.brand ? { accent: input.brand.accent, captionStyle: input.brand.captionStyle, font: input.brand.font, logoUrl: input.brand.logoAssetId ? await urlFor(assetsById.get(input.brand.logoAssetId)) : undefined } : undefined,
      reviewScript: input.reviewScript ?? false,
      generatedScript: generatedScriptOf(stepsByKey.get("script"), input.seconds ?? workflowSettings.adSeconds),
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
        qa: t.qa ? { changes: t.qa.changes, warnings: t.qa.warnings, summary: t.qa.summary } : undefined,
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

/** Every read and write below is scoped to the signed-in user: a project of someone else is "not found". */
export async function listProjects(userId: string, limit = 100): Promise<Project[]> {
  const rows = await db().select().from(projects).where(eq(projects.ownerId, userId)).orderBy(desc(projects.createdAt)).limit(limit);
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

export async function getProject(id: string, userId: string): Promise<Project | null> {
  const [row] = await db().select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, userId))).limit(1);
  if (!row) return null;
  const { stepRows, translationRows, assetRows } = await loadRelated([row.id]);
  return toProject(row, stepRows, translationRows, assetRows);
}

export async function getProjectRow(id: string, userId: string) {
  const [row] = await db().select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, userId))).limit(1);
  return row ?? null;
}

/** For the orchestrator and webhooks only (no user in the request): unscoped read by id. */
export async function getProjectRowUnscoped(id: string) {
  const [row] = await db().select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ?? null;
}

/* ---------- creation: draft → upload assets → start ---------- */

export type NewAdProject = { name: string; seconds: number; engine: "avatar_iii" | "avatar_iv"; lookId?: string; language: AdLanguageCode; accent?: string; voiceId?: string; speed: SpeedKey; offer?: string; direction?: string; tone: AdTone; backgroundColor?: string; brand?: { accent?: string; captionStyle?: string; font?: string }; reviewScript: boolean; productName: string; productUrl?: string; description: string; script?: string };
export type NewTranslateProject = {
  name: string;
  sourceFileName: string;
  sourceSeconds: number;
  sourceLanguage: LanguageCode | "auto";
  targetLanguages: LanguageCode[];
  quality: TranslationQuality;
  keepTerms?: string[];
  trimSilence?: boolean;
  captionPosition?: "low" | "middle";
  format: "original" | "9:16";
  enhance: boolean;
  rightsConfirmed: boolean;
};

/** Creates the project and its step rows in status draft. Files are attached next, then `startProject`. */
export async function createDraft(userId: string, input: { workflow: "ad"; ad: NewAdProject } | { workflow: "translate"; translate: NewTranslateProject }) {
  const d = db();
  if (input.workflow === "ad") {
    const a = input.ad;
    const [row] = await d
      .insert(projects)
      .values({
        ownerId: userId,
        workflow: "ad",
        name: a.name,
        status: "draft",
        input: { seconds: a.seconds, engine: a.engine, lookId: a.lookId, language: a.language, accent: a.accent, voiceId: a.voiceId, speed: a.speed, offer: a.offer, direction: a.direction, tone: a.tone, background: a.backgroundColor ? { type: "color", value: a.backgroundColor } : undefined, brand: a.brand, reviewScript: a.reviewScript, productName: a.productName, productUrl: a.productUrl, description: a.description, script: a.script, imageAssetIds: [] } satisfies AdInput,
      })
      .returning();
    await d.insert(steps).values(AD_STEPS.map((key) => ({ projectId: row.id, userId, key, status: "waiting" as const })));
    return row;
  }
  const t = input.translate;
  if (!t.rightsConfirmed) throw new DataError("Confirm the rights to the video first.", 400, "rights_required");
  const [row] = await d
    .insert(projects)
    .values({
      ownerId: userId,
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
        keepTerms: t.keepTerms,
        trimSilence: t.trimSilence ?? true,
        captionPosition: t.captionPosition ?? "low",
        format: t.format,
        enhance: t.enhance,
      } satisfies TranslateInput,
    })
    .returning();
  await d.insert(steps).values(TRANSLATE_STEPS.map((key) => ({ projectId: row.id, userId, key, status: "waiting" as const })));
  await d.insert(translations).values(t.targetLanguages.map((language) => ({ projectId: row.id, userId, language, status: "waiting" as const, segments: [] })));
  return row;
}

/** Registers an object the browser uploaded with a signed URL. Verifies it really exists. */
export async function attachUploadedAsset(userId: string, projectId: string, file: { kind: UploadKind; storagePath: string; fileName: string; seconds?: number }) {
  const row = await getProjectRow(projectId, userId);
  if (!row) throw new DataError("Project not found.", 404, "not_found");
  if (row.status !== "draft") throw new DataError("Files can only be added before the project starts.", 409, "not_draft");
  if (!file.storagePath.startsWith(`projects/${projectId}/`)) throw new DataError("File path does not belong to this project.", 400, "bad_path");
  const info = await objectInfo(file.storagePath);
  if (!info) throw new DataError("The uploaded file was not found in storage. Upload it again.", 400, "missing_object");
  const [asset] = await db()
    .insert(assets)
    .values({ projectId, userId, kind: file.kind, storagePath: file.storagePath, mime: info.mime, bytes: info.bytes, seconds: file.seconds })
    .returning();
  if (row.workflow === "ad" && file.kind === "image") {
    const input = row.input as AdInput;
    await db().update(projects).set({ input: { ...input, imageAssetIds: [...input.imageAssetIds, asset.id] }, updatedAt: new Date() }).where(eq(projects.id, projectId));
  }
  if (row.workflow === "ad" && file.kind === "background") {
    const input = row.input as AdInput;
    await db().update(projects).set({ input: { ...input, background: { type: "image", assetId: asset.id } }, updatedAt: new Date() }).where(eq(projects.id, projectId));
  }
  if (row.workflow === "ad" && file.kind === "logo") {
    const input = row.input as AdInput;
    await db().update(projects).set({ input: { ...input, brand: { ...(input.brand ?? {}), logoAssetId: asset.id } }, updatedAt: new Date() }).where(eq(projects.id, projectId));
  }
  if (row.workflow === "translate" && file.kind === "source") {
    const input = row.input as TranslateInput;
    await db().update(projects).set({ input: { ...input, sourceAssetId: asset.id }, updatedAt: new Date() }).where(eq(projects.id, projectId));
  }
  return asset;
}

/** Draft → processing and the workflow event. Idempotent: a second call returns the project unchanged (rule 4). */
export async function startProject(userId: string, projectId: string) {
  const row = await getProjectRow(projectId, userId);
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

  // Per-user limits (day and month) on top of the budget per creative.
  const perUser = await checkUserLimits(userId, estimate * (row.workflow === "translate" ? (row.input as TranslateInput).targetLanguages.length : 1));
  if (!perUser.ok) throw new DataError(perUser.message, 429, "user_limit");

  const firstStep = row.workflow === "ad" ? "script" : "upload";
  await db().transaction(async (tx) => {
    await tx.update(projects).set({ status: "processing", updatedAt: new Date() }).where(eq(projects.id, projectId));
    await tx.update(steps).set({ status: "processing", startedAt: new Date(), attempt: 1, updatedAt: new Date() }).where(and(eq(steps.projectId, projectId), eq(steps.key, firstStep)));
  });
  try {
    await inngest.send(row.workflow === "ad" ? adProjectCreated.create({ projectId }) : translateProjectCreated.create({ projectId }));
  } catch (error) {
    // The job system did not take the event: put the project back to draft so nothing looks "in progress".
    await db().transaction(async (tx) => {
      await tx.update(projects).set({ status: "draft", updatedAt: new Date() }).where(eq(projects.id, projectId));
      await tx.update(steps).set({ status: "waiting", startedAt: null, updatedAt: new Date() }).where(and(eq(steps.projectId, projectId), eq(steps.key, firstStep)));
    });
    const dev = process.env.INNGEST_DEV === "1" || process.env.INNGEST_DEV === "true";
    throw new DataError(
      dev
        ? "The background job service is not running, so the video cannot start. Run `npm run dev:jobs` in a second terminal and click Generate again."
        : "The background job service is not reachable. Try again in a minute; if it keeps failing, contact support.",
      503,
      "jobs_unreachable",
      error,
    );
  }
  return (await getProjectRow(projectId, userId))!;
}

/* ---------- review, approval, retry (workflow B and both) ---------- */

/**
 * "Review script first": the customer picked a hook and maybe edited the presenter text.
 * Stores the approved script on the script step, marks it completed and wakes the waiting run.
 */
export async function approveScript(userId: string, projectId: string, review: { hookIndex: number; presenterScript?: string }) {
  const row = await getProjectRow(projectId, userId);
  if (!row || row.workflow !== "ad") throw new DataError("Project not found.", 404, "not_found");
  const [step] = await db().select().from(steps).where(and(eq(steps.projectId, projectId), eq(steps.key, "script"))).limit(1);
  const script = step?.output?.script as AdScript | undefined;
  if (!step || !script) throw new DataError("There is no script to approve yet.", 409, "no_script");
  if (step.status !== "needs_input") return row; // already approved: idempotent
  normaliseHooks(script);
  const approved = applyScriptReview(script, review);
  const max = maxSpokenWords((row.input as AdInput).seconds ?? workflowSettings.adSeconds);
  const words = countWords(approved.presenterScript);
  if (words === 0) throw new DataError("The presenter text cannot be empty.", 400, "empty_script");
  if (words > max) throw new DataError(`The presenter text is ${words} words; the limit for this length is ${max}. Shorten it to continue.`, 400, "too_long");
  await db().transaction(async (tx) => {
    await tx
      .update(steps)
      .set({ status: "completed", finishedAt: new Date(), output: { ...(step.output ?? {}), script: approved, approvedAt: new Date().toISOString(), hookIndex: review.hookIndex, wordCount: words }, updatedAt: new Date() })
      .where(eq(steps.id, step.id));
    await tx.update(projects).set({ status: "processing", updatedAt: new Date() }).where(eq(projects.id, projectId));
  });
  await inngest.send(adScriptApproved.create({ projectId }));
  return (await getProjectRow(projectId, userId))!;
}

export async function retryStep(userId: string, projectId: string, stepKey: string) {
  const row = await getProjectRow(projectId, userId);
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


/** Maps DataError / CostGuardError to a JSON response. */
export function dataErrorResponse(error: unknown): Response {
  const guard = costGuardResponse(error);
  if (guard) return guard;
  const auth = authErrorResponse(error);
  if (auth) return auth;
  if (error instanceof DataError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  const e = error as { message?: string; status?: number };
  return Response.json({ error: e?.message ?? "Unexpected error." }, { status: typeof e?.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 500 });
}
