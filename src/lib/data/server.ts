import "server-only";
import type { CaptionStyleChoice } from "@/lib/captionOptions";
import type { PresenterTranslate } from "@/lib/presenterTranslate";
import { config } from "@/lib/config";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { AdProject, LanguageCode, Project, Step, StepKey, TranslateProject, TranslateStepKey, TranslationQuality } from "@/lib/types";
import { assets, db, projects, steps, translations, type AdInput, type AssetRow, type ProjectRow, type StepRow, type TranslateInput, type TranslationRow } from "@/lib/db";
import { adProjectCreated, adScriptApproved, autoReloadCheck, inngest, stepRetry, translateProjectCreated } from "@/lib/inngest/client";
import { applyScriptReview, countWords, normaliseHooks, type AdScript } from "@/lib/services/script";
import { maxSpokenWords } from "@/lib/pricing";
import { copyObject, objectPath, objectInfo, signedDownloadUrl } from "@/lib/storage";
import { checkUserLimits, costGuardResponse, costLimits, creativeSpent, getProjectSpend } from "@/lib/services/costGuard";
import { estimateAdCost, estimateTranslateCost } from "@/lib/pricing";
import { workflowSettings } from "@/lib/workflow/settings";
import { DEFAULT_TONE, isAdTone, type AdTone } from "@/lib/adOptions";
import { DEFAULT_SPEED, isSpeedKey, speedValue, type AdLanguageCode, type SpeedKey } from "@/lib/voiceOptions";
import type { UploadKind } from "@/lib/data/uploads";
import { authErrorResponse } from "@/lib/auth";
import { CreditError, projectCreditsUsed, reserveCredits, reserveForRetry } from "@/lib/credits";
import { adCredits, FEATURE_PLAN, FREE_AD, hasFeature, translateCredits } from "@/lib/plans";
import { DataError } from "@/lib/data/errors";
import { textRemovalConfigured } from "@/lib/services/textRemoval";
import { workspaces } from "@/lib/db";

/** Who acts and in which workspace. Every project read or write is scoped to the workspace; the user is recorded on rows. */
export type DataScope = { userId: string; workspaceId: string };

/**
 * Data access for real projects (database mode). The UI calls this through the routes in
 * src/app/api/projects; the orchestrator (src/lib/inngest/functions) writes the step rows.
 * The mock store in src/lib/mock offers the same operations for demo mode.
 */

export const AD_STEPS: StepKey[] = ["script", "productClip", "presenter", "finalEdit"];
export const TRANSLATE_STEPS: TranslateStepKey[] = ["upload", "translate", "captions"];

export { DataError };

/* ---------- row → Project (what the screens render) ---------- */

/** The script step's output as the review screen needs it (hooks, text, limit). */
function generatedScriptOf(step: StepRow | undefined, seconds: number) {
  const script = step?.output?.script as AdScript | undefined;
  if (!script) return undefined;
  const hooks = (script.hooks?.length ? script.hooks : [script.hook]).map((h) => ({ spoken: h.spoken }));
  return { hooks, presenterScript: script.presenterScript, maxWords: maxSpokenWords(seconds) };
}

/** The phase of one language version, as the workflow wrote it on the captions step (`output.phases[code]`). */
function languagePhase(captions: StepRow | undefined, code: string): TranslateProject["translations"][number]["phase"] {
  const phases = captions?.output?.phases as Record<string, { key?: string; at?: string }> | undefined;
  const p = phases?.[code];
  if (!p || typeof p.key !== "string" || typeof p.at !== "string") return undefined;
  if (p.key !== "voice" && p.key !== "enhance" && p.key !== "captions" && p.key !== "done") return undefined;
  return { key: p.key, at: p.at };
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

/**
 * A choice the workspace's plan does not include, as a plain message; null when everything is
 * allowed. The forms lock these options already; this is the server-side guard (API included).
 */
export function lockedFeature(row: Pick<ProjectRow, "workflow" | "input">, planKey: string): string | null {
  if (row.workflow === "ad") {
    const input = row.input as AdInput;
    if ((input.engine ?? workflowSettings.heygenEngine) === "avatar_iv" && !hasFeature(planKey, "premium")) return `The Premium presenter comes with the ${FEATURE_PLAN.premium} plan. Pick Standard, or upgrade in Billing.`;
    return null;
  }
  const input = row.input as TranslateInput;
  if (input.quality === "precision" && !hasFeature(planKey, "precision")) return `Precision translation comes with the ${FEATURE_PLAN.precision} plan. Pick Speed, or upgrade in Billing.`;
  if (input.enhance && !hasFeature(planKey, "enhance")) return `Picture enhancement comes with the ${FEATURE_PLAN.enhance} plan. Turn it off, or upgrade in Billing.`;
  if (input.speaker === "presenter" && !hasFeature(planKey, "aiPresenter")) return `Translating with an AI presenter comes with the ${FEATURE_PLAN.aiPresenter} plan. Keep the original speaker, or upgrade in Billing.`;
  if (input.speaker === "presenter" && input.presenter?.engine === "avatar_iv" && !hasFeature(planKey, "premium")) return `The Premium presenter comes with the ${FEATURE_PLAN.premium} plan. Pick Standard, or upgrade in Billing.`;
  if (input.removeText && !hasFeature(planKey, "removeText")) return `Removing on-screen text comes with the ${FEATURE_PLAN.removeText} plan. Turn it off, or upgrade in Billing.`;
  return null;
}

/** Credits one project costs, from the same estimates (A: whole ad; B: per language × languages). */
export function creditsForProject(row: ProjectRow) {
  if (row.workflow === "ad") {
    const input = row.input as AdInput;
    return adCredits({ seconds: input.seconds ?? workflowSettings.adSeconds, engine: input.engine ?? workflowSettings.heygenEngine, speed: speedValue(input.speed) });
  }
  const input = row.input as TranslateInput;
  return translateCredits({ seconds: input.sourceSeconds, quality: input.quality, enhance: input.enhance, removeText: input.removeText, presenterEngine: input.speaker === "presenter" ? input.presenter?.engine : undefined, languages: input.targetLanguages.length, hasSourceTranscript: input.sourceLanguage !== "auto" }) * input.targetLanguages.length;
}

/** Estimate for one click, with the same numbers the forms show. */
export function estimateForProject(row: ProjectRow) {
  if (row.workflow === "ad") {
    const input = row.input as AdInput;
    return estimateAdCost({ seconds: input.seconds ?? workflowSettings.adSeconds, clipModel: workflowSettings.clipModel, engine: input.engine ?? workflowSettings.heygenEngine, speed: speedValue(input.speed) }).total;
  }
  const input = row.input as TranslateInput;
  return estimateTranslateCost({ seconds: input.sourceSeconds, quality: input.quality, enhance: input.enhance, removeText: input.removeText, presenterEngine: input.speaker === "presenter" ? input.presenter?.engine : undefined, languages: input.targetLanguages.length, hasSourceTranscript: input.sourceLanguage !== "auto" }).perLanguageTotal;
}

async function toProject(row: ProjectRow, stepRows: StepRow[], translationRows: TranslationRow[], assetRows: AssetRow[]): Promise<Project> {
  const stepsByKey = new Map(stepRows.map((s) => [s.key, s]));
  const assetsById = new Map(assetRows.map((a) => [a.id, a]));
  const spend = await getProjectSpend(row.id);
  const creditsUsed = config.demoMode ? undefined : await projectCreditsUsed(row.id).catch(() => undefined);
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
      format: input.format,
      hook: input.hook,
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
      creditsUsed,
      parentId: row.parentId ?? undefined,
      version: row.version,
      batchId: row.batchId ?? undefined,
      tags: row.tags ?? undefined,
      archivedAt: row.archivedAt?.toISOString(),
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
    enhance: input.enhance,
    removeText: input.removeText,
    format: input.format ?? "9:16",
    captionsOn: input.captionStyle?.show !== false,
    speaker: input.speaker ?? "original",
    presenter: input.presenter,
    rightsConfirmedAt: (row.rightsConfirmedAt ?? row.createdAt).toISOString(),
    rightsBasis: input.rightsBasis ?? "own_upload",
    steps: Object.fromEntries(TRANSLATE_STEPS.map((k) => [k, toStep(stepsByKey.get(k))])) as Record<TranslateStepKey, Step>,
    translations: await Promise.all(
      translationRows.map(async (t) => ({
        language: t.language,
        status: t.status,
        // Where the version is while it renders (27 Oct 2026): written by the workflow on the captions step.
        phase: languagePhase(stepsByKey.get("captions"), t.language),
        segments: t.segments,
        // The finished file only: a half-made version never shows as the result (27 Oct 2026).
        videoUrl: t.status === "completed" ? await urlFor(assetsById.get(t.captionedAssetId ?? t.enhancedAssetId ?? t.videoAssetId ?? "")) : undefined,
        error: t.error ?? undefined,
        qa: t.qa ? { changes: t.qa.changes, warnings: t.qa.warnings, summary: t.qa.summary } : undefined,
        spentUsd: creativeSpent(spend, t.language, input.targetLanguages.length),
      })),
    ),
    spentUsd: spend.totalUsd,
    budgetUsd,
    estimateUsd,
    creditsUsed,
    parentId: row.parentId ?? undefined,
    tags: row.tags ?? undefined,
    archivedAt: row.archivedAt?.toISOString(),
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

/** The projects of one batch, as the screens render them (scoped to the workspace). */
export async function listProjectsOfBatch(scope: DataScope, batchId: string): Promise<Project[]> {
  const rows = await db().select().from(projects).where(and(eq(projects.workspaceId, scope.workspaceId), eq(projects.batchId, batchId))).orderBy(projects.createdAt);
  const { stepRows, translationRows, assetRows } = await loadRelated(rows.map((r) => r.id));
  return Promise.all(rows.map((r) => toProject(r, stepRows.filter((s) => s.projectId === r.id), translationRows.filter((t) => t.projectId === r.id), assetRows.filter((a) => a.projectId === r.id))));
}

/** Every read and write below is scoped to the workspace: a project of another workspace is "not found". */
export async function listProjects(scope: DataScope, limit = 100): Promise<Project[]> {
  const rows = await db().select().from(projects).where(eq(projects.workspaceId, scope.workspaceId)).orderBy(desc(projects.createdAt)).limit(limit);
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

export async function getProject(id: string, scope: DataScope): Promise<Project | null> {
  const [row] = await db().select().from(projects).where(and(eq(projects.id, id), eq(projects.workspaceId, scope.workspaceId))).limit(1);
  if (!row) return null;
  const { stepRows, translationRows, assetRows } = await loadRelated([row.id]);
  return toProject(row, stepRows, translationRows, assetRows);
}

/**
 * The finished file of a project for "Download" (26 Oct 2026): a signed link that makes the storage
 * send it as an attachment with a clean file name, so the browser saves it and stays on the page
 * (a plain link to the storage domain opened the raw URL instead). Null when not ready or not yours.
 */
export async function resultDownloadUrl(id: string, scope: DataScope, language?: string | null) {
  const row = await getProjectRow(id, scope);
  if (!row) return null;
  let assetId: string | null = null;
  let suffix = "";
  if (row.workflow === "ad") assetId = row.finalAssetId;
  else {
    const rows = await db().select().from(translations).where(eq(translations.projectId, row.id));
    const t = rows.find((x) => (language ? x.language === language : true) && (x.captionedAssetId || x.enhancedAssetId || x.videoAssetId));
    assetId = t ? (t.captionedAssetId ?? t.enhancedAssetId ?? t.videoAssetId) : null;
    suffix = t ? ` (${t.language})` : "";
  }
  if (!assetId) return null;
  const [asset] = await db().select().from(assets).where(and(eq(assets.id, assetId), eq(assets.projectId, row.id))).limit(1);
  if (!asset) return null;
  const safeName = `${row.name}${suffix}`.replace(/[^\p{L}\p{N} ()._-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "video";
  return signedDownloadUrl(asset.storagePath, 300, `${safeName}.mp4`);
}

export async function getProjectRow(id: string, scope: DataScope) {
  const [row] = await db().select().from(projects).where(and(eq(projects.id, id), eq(projects.workspaceId, scope.workspaceId))).limit(1);
  return row ?? null;
}

/** For the orchestrator and webhooks only (no user in the request): unscoped read by id. */
export async function getProjectRowUnscoped(id: string) {
  const [row] = await db().select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ?? null;
}

/* ---------- creation: draft → upload assets → start ---------- */

export type NewAdProject = { parentId?: string; format?: string; hook?: string; batchId?: string; name: string; seconds: number; engine: "avatar_iii" | "avatar_iv"; lookId?: string; language: AdLanguageCode; accent?: string; voiceId?: string; speed: SpeedKey; offer?: string; direction?: string; tone: AdTone; backgroundColor?: string; brand?: { accent?: string; captionStyle?: string; font?: string }; reviewScript: boolean; productName: string; productUrl?: string; description: string; script?: string };
export type NewTranslateProject = {
  /** "Localize this ad": the completed ad whose finished video is the source. */
  sourceProjectId?: string;
  name: string;
  sourceFileName: string;
  sourceSeconds: number;
  sourceLanguage: LanguageCode | "auto";
  targetLanguages: LanguageCode[];
  quality: TranslationQuality;
  keepTerms?: string[];
  replaceTerms?: { from: string; to: string }[];
  instructions?: string;
  trimSilence?: boolean;
  captionPosition?: "low" | "middle";
  captionStyle?: Partial<CaptionStyleChoice>;
  removeMusic?: boolean;
  cleanVoice?: boolean;
  naturalPace?: boolean;
  removeText?: boolean;
  speaker?: "original" | "presenter";
  presenter?: PresenterTranslate;
  format: "original" | "9:16";
  enhance: boolean;
  rightsConfirmed: boolean;
};

/** Creates the project and its step rows in status draft. Files are attached next, then `startProject`. */
export async function createDraft(scope: DataScope, input: { workflow: "ad"; ad: NewAdProject } | { workflow: "translate"; translate: NewTranslateProject }) {
  const d = db();
  const { userId, workspaceId } = scope;
  if (input.workflow === "ad") {
    const a = input.ad;
    const lineage = await versionLineage(scope, a.parentId);
    const [row] = await d
      .insert(projects)
      .values({
        ownerId: userId,
        workspaceId,
        workflow: "ad",
        name: a.name,
        status: "draft",
        parentId: lineage.rootId,
        version: lineage.version,
        batchId: a.batchId ?? null,
        input: { seconds: a.seconds, engine: a.engine, lookId: a.lookId, language: a.language, accent: a.accent, voiceId: a.voiceId, speed: a.speed, offer: a.offer, direction: a.direction, tone: a.tone, background: a.backgroundColor ? { type: "color", value: a.backgroundColor } : undefined, brand: a.brand, reviewScript: a.reviewScript, format: a.format, hook: a.hook, productName: a.productName, productUrl: a.productUrl, description: a.description, script: a.script, imageAssetIds: [] } satisfies AdInput,
      })
      .returning();
    await d.insert(steps).values(AD_STEPS.map((key) => ({ projectId: row.id, userId, key, status: "waiting" as const })));
    return row;
  }
  const t = input.translate;
  if (!t.rightsConfirmed) throw new DataError("Confirm the rights to the video first.", 400, "rights_required");
  const sourceAd = t.sourceProjectId ? await finishedAdAsSource(scope, t.sourceProjectId) : null;
  const [row] = await d
    .insert(projects)
    .values({
      ownerId: userId,
      workspaceId,
      workflow: "translate",
      name: t.name,
      status: "draft",
      rightsConfirmedAt: new Date(),
      parentId: sourceAd?.project.id ?? null,
      input: {
        sourceFileName: sourceAd ? `${sourceAd.project.name}.mp4` : t.sourceFileName,
        sourceSeconds: sourceAd ? sourceAd.seconds : t.sourceSeconds,
        sourceAssetId: "",
        rightsBasis: sourceAd ? "generated" : "own_upload",
        sourceLanguage: t.sourceLanguage,
        targetLanguages: t.targetLanguages,
        quality: t.quality,
        keepTerms: t.keepTerms,
        ...(t.replaceTerms?.length ? { replaceTerms: t.replaceTerms } : {}),
        ...(t.instructions?.trim() ? { instructions: t.instructions.trim() } : {}),
        trimSilence: t.trimSilence ?? true,
        captionPosition: t.captionPosition ?? "low",
        ...(t.captionStyle ? { captionStyle: t.captionStyle } : {}),
        ...(t.removeMusic ? { removeMusic: true } : {}),
        ...(t.cleanVoice ? { cleanVoice: true } : {}),
        // Natural speaking pace is the default (27 Oct 2026, no extra cost: billing follows the source length).
        naturalPace: t.naturalPace !== false,
        ...(t.removeText ? { removeText: true } : {}),
        ...(t.speaker === "presenter" && t.presenter ? { speaker: "presenter" as const, presenter: t.presenter } : {}),
        format: t.format,
        enhance: t.enhance,
      } satisfies TranslateInput,
    })
    .returning();
  await d.insert(steps).values(TRANSLATE_STEPS.map((key) => ({ projectId: row.id, userId, key, status: "waiting" as const })));
  await d.insert(translations).values(t.targetLanguages.map((language) => ({ projectId: row.id, userId, language, status: "waiting" as const, segments: [] })));
  if (sourceAd) {
    // The finished ad becomes this project's source: the file is copied inside our storage (every
    // project owns its files; storage paths are unique), no upload from the browser.
    const target = objectPath({ projectId: row.id, kind: "source", fileName: `${sourceAd.project.name}.mp4` });
    try {
      await copyObject(sourceAd.asset.storagePath, target);
    } catch (error) {
      await d.delete(projects).where(eq(projects.id, row.id));
      throw new DataError("The finished video of this ad could not be copied. Try again in a moment.", 503, "copy_failed", error);
    }
    const [asset] = await d
      .insert(assets)
      .values({ projectId: row.id, userId, kind: "source", storagePath: target, mime: sourceAd.asset.mime, bytes: sourceAd.asset.bytes, seconds: sourceAd.seconds, width: sourceAd.asset.width, height: sourceAd.asset.height })
      .returning();
    const [updated] = await d.update(projects).set({ input: { ...(row.input as TranslateInput), sourceAssetId: asset.id }, updatedAt: new Date() }).where(eq(projects.id, row.id)).returning();
    return updated;
  }
  return row;
}

/** "Localize this ad": the ad must be a completed ad of this workspace with a finished video in storage. */
async function finishedAdAsSource(scope: DataScope, adId: string) {
  const project = await getProjectRow(adId, scope);
  if (!project || project.workflow !== "ad") throw new DataError("The ad to translate was not found.", 404, "not_found");
  if (project.status !== "completed" || !project.finalAssetId) throw new DataError("This ad has no finished video yet. Translate it once it is completed.", 409, "not_completed");
  const [asset] = await db().select().from(assets).where(eq(assets.id, project.finalAssetId)).limit(1);
  if (!asset) throw new DataError("The finished video of this ad is missing from storage.", 409, "missing_object");
  const input = project.input as AdInput;
  return { project, asset, seconds: asset.seconds ?? input.seconds ?? workflowSettings.adSeconds };
}

/**
 * "Make another version": every version points at the first ad of the group (the root) and gets
 * the next number. The parent must be an ad in the same workspace; anything else is "not found".
 */
async function versionLineage(scope: DataScope, parentId: string | undefined): Promise<{ rootId: string | null; version: number }> {
  if (!parentId) return { rootId: null, version: 1 };
  const parent = await getProjectRow(parentId, scope);
  if (!parent || parent.workflow !== "ad") throw new DataError("The ad to make a version of was not found.", 404, "not_found");
  const rootId = parent.parentId ?? parent.id;
  const [top] = await db().select({ max: sql<number>`coalesce(max(${projects.version}), 1)` }).from(projects).where(and(eq(projects.workspaceId, scope.workspaceId), or(eq(projects.id, rootId), eq(projects.parentId, rootId))));
  return { rootId, version: Number(top?.max ?? 1) + 1 };
}

/** Registers an object the browser uploaded with a signed URL. Verifies it really exists. */
export async function attachUploadedAsset(scope: DataScope, projectId: string, file: { kind: UploadKind; storagePath: string; fileName: string; seconds?: number }) {
  const { userId } = scope;
  const row = await getProjectRow(projectId, scope);
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
export async function startProject(scope: DataScope, projectId: string) {
  const { userId, workspaceId } = scope;
  const row = await getProjectRow(projectId, scope);
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

  // Credits: the free plan may only start the free combination; every project reserves its credits first.
  const credits = creditsForProject(row);
  const [profile] = await db().select({ planKey: workspaces.planKey }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if ((profile?.planKey ?? "free") === "free" && row.workflow === "ad") {
    const input = row.input as AdInput;
    if ((input.seconds ?? workflowSettings.adSeconds) !== FREE_AD.seconds || (input.engine ?? workflowSettings.heygenEngine) !== FREE_AD.engine) {
      throw new DataError(`On the free plan an ad is ${FREE_AD.seconds} seconds in Standard quality (your free credits cover exactly that). Pick a plan in Billing for other lengths and Premium.`, 402, "free_plan_limit");
    }
  }
  // What the plan unlocks (26 Oct 2026): Premium and Precision from Pro, enhancement from Scale.
  const planKey = profile?.planKey ?? "free";
  const locked = lockedFeature(row, planKey);
  if (locked) throw new DataError(locked, 402, "plan_feature");
  // The text remover needs its own key; without it the option cannot run, so say so before anything is reserved.
  if (row.workflow === "translate" && (row.input as TranslateInput).removeText && !textRemovalConfigured()) {
    throw new DataError("Removing on-screen text is not available yet. Turn it off to start the translation.", 503, "text_removal_off");
  }
  // Translations on the free plan (25 Oct 2026): the 30 free credits cover half a minute of Speed translation; the balance check below decides.
  try {
    await reserveCredits(workspaceId, userId, projectId, credits, `${row.workflow === "ad" ? "Ad" : "Translation"}: ${row.name}`);
  } catch (error) {
    if (error instanceof CreditError) throw new DataError(error.message, error.status, error.code);
    throw error;
  }

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
  // Credits went down: let auto-reload look at the balance (never blocks or fails the start).
  await inngest.send(autoReloadCheck.create({ workspaceId })).catch(() => {});
  return (await getProjectRow(projectId, scope))!;
}

/* ---------- review, approval, retry (workflow B and both) ---------- */

/**
 * "Review script first": the customer picked a hook and maybe edited the presenter text.
 * Stores the approved script on the script step, marks it completed and wakes the waiting run.
 */
export async function approveScript(scope: DataScope, projectId: string, review: { hookIndex: number; presenterScript?: string }) {
  const row = await getProjectRow(projectId, scope);
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
  return (await getProjectRow(projectId, scope))!;
}

/** Rename, tag, archive or unarchive a project (scoped). Nothing else about the project changes. */
export async function updateProjectMeta(scope: DataScope, projectId: string, patch: { name?: string; tags?: string[]; archived?: boolean }) {
  const row = await getProjectRow(projectId, scope);
  if (!row) throw new DataError("Project not found.", 404, "not_found");
  const set: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length < 2 || name.length > 120) throw new DataError("Give the project a name of 2 to 120 characters.", 400, "bad_name");
    set.name = name;
  }
  if (patch.tags !== undefined) set.tags = normaliseTags(patch.tags);
  if (patch.archived !== undefined) set.archivedAt = patch.archived ? new Date() : null;
  const [updated] = await db().update(projects).set(set).where(eq(projects.id, projectId)).returning();
  return updated;
}

/** Lower-case, trimmed, unique, at most 10 tags of 30 characters. */
export function normaliseTags(tags: string[]) {
  return [...new Set(tags.map((t) => t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30)).filter(Boolean))].slice(0, 10);
}

export async function retryStep(scope: DataScope, projectId: string, stepKey: string) {
  const row = await getProjectRow(projectId, scope);
  if (!row) throw new DataError("Project not found.", 404, "not_found");
  const [step] = await db().select().from(steps).where(and(eq(steps.projectId, projectId), eq(steps.key, stepKey))).limit(1);
  if (!step) throw new DataError("Unknown step.", 404, "not_found");
  if (step.status !== "failed") throw new DataError("Only a failed step can be retried.", 409, "not_failed");
  // A failed project got its credits back; a retry reserves them again (29 Oct 2026: retries were free).
  try {
    await reserveForRetry(projectId);
  } catch (error) {
    if (error instanceof CreditError) throw new DataError(error.message.replace("to start it", "to retry it"), error.status, error.code);
    throw error;
  }
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
  // Unexpected errors keep their cause in the server log (never in the response).
  console.error("[data] unexpected error", error instanceof Error ? error.message : error, (error as { cause?: unknown })?.cause);
  const e = error as { message?: string; status?: number };
  return Response.json({ error: e?.message ?? "Unexpected error." }, { status: typeof e?.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 500 });
}
