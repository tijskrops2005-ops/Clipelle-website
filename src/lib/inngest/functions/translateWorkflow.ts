import { and, eq, gte, ne, sql } from "drizzle-orm";
import { inngest, qualityCheckRequested, stepRetry, translateProjectCreated } from "@/lib/inngest/client";
import { chunkCharsFor, chunkCues, fillGaps } from "@/lib/captionChunks";
import { firstChange } from "@/lib/sceneCut";
import { buildEndProbeEdit, gifFrames } from "@/lib/services/endProbe";
import { captionStyleOf, styleOverRemovedText } from "@/lib/captionOptions";
import { assets, db, projects, steps, translations, type TranslateInput, type TranslationRow } from "@/lib/db";
import { glossaryPronunciations, glossaryReplacements, mergeGlossaries, replacementsFor, type GlossaryEntries, type LocalizedReplacements } from "@/lib/localizedTerms";
import { localizeReplacements, LOCALIZE_TERMS_USD, type Pronunciations } from "@/lib/services/localizeTerms";
import { extractFrame, EXTRACT_FRAME_USD, LOCATE_TEXT_USD, locateBurnedCaptions, measureRemovedText, MEASURE_MOMENTS, type TextBox } from "@/lib/services/textLocate";
import { FRAME_AT_USD } from "@/lib/services/frameAt";
import { downloadTextRemovalOutput, estimateTextRemovalUsd, getTextRemoval, startTextRemoval, TEXT_REMOVAL_MODEL, TEXT_REMOVAL_USD_PER_GPU_SECOND } from "@/lib/services/textRemoval";
import { languageCodeForName, languageOf } from "@/lib/languages";
import { checkTranslation, estimateCheckUsd } from "@/lib/services/translationCheck";
import type { LanguageCode, Segment } from "@/lib/types";
import { SHOTSTACK_USD_PER_SECOND } from "@/lib/translatePricing";
import {
  alignOriginalText,
  buildSrt,
  createProofread,
  downloadProofreadSrt,
  estimateGenerateUsd,
  estimateProofreadUsd,
  fetchSrtText,
  generateFromProofread,
  getProofread,
  getTranslation,
  isPlanRestriction,
  listTranslationLanguages,
  matchLanguages,
  parseSrt,
  uploadHeygenAsset,
  uploadProofreadSrt,
  applyBrandGlossary,
  type SrtCue,
  createDirectTranslation,
  directSession,
  parseDirectSession,
} from "@/lib/services/translate";
import { estimateEnhanceUsd, getEnhanceStatus, submitEnhance } from "@/lib/services/enhance";
import { buildCaptionEdit, buildPresenterTranslateEdit, captionBoxWidth, buildRemuxEdit, getRender, ingestFromUrl, shotstackEnv, startRender } from "@/lib/services/finalEdit";
import { createAvatarVideo, estimateCostUsd, estimateSeconds, getVideo } from "@/lib/services/heygen";
import { pickPresenter } from "@/lib/inngest/functions/adWorkflow";
import { speedValue } from "@/lib/voiceOptions";
import type { AdInput } from "@/lib/db";
import { reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { workflowSettings as cfg } from "@/lib/workflow/settings";
import {
  afterProjectEnd,
  downloadAsset,
  failStep,
  settleProjectCredits,
  loadAsset,
  loadProject,
  loadStep,
  markCompleted,
  markProcessing,
  plainMessage,
  providerUrl,
  StepFailure,
  storeBytes,
  storeFromUrl,
  withDeadline,
  withRetries, waitForJob, untilFree, busySeconds, type Busy } from "@/lib/workflow/steps";
import { callbackUrlFor } from "@/lib/webhooks/incoming";

/**
 * Workflow B — an existing video → the same video in other languages.
 *
 *   upload (HeyGen asset) → translate (proofread session per language, + source transcript)
 *   → review (wait for the user, or Claude rewrites in ad tone automatically)
 *   → captions: per language render the translation, optional enhancement, Shotstack captions
 *     in 9:16 or the original format → storage → completed
 *
 * Triggered by project/translate.created and project/step.retry. Steps are idempotent.
 */

const MAX_POLLS = Math.ceil((cfg.maxWaitMinutes * 60) / cfg.pollSeconds);

type StepTools = Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"];

export const translateWorkflow = inngest.createFunction(
  {
    id: "workflow-translate",
    name: "Workflow B: translate an existing video",
    retries: 0,
    // One run per project (27 Oct 2026, Tijs: everyone can start the next video while one runs). The
    // limit was 3 for all customers together, which queued customer B behind customer A. Paid calls
    // stay bounded by the cost guard and the credits, not by a queue.
    concurrency: { limit: 1, key: "event.data.projectId" },
    triggers: [translateProjectCreated, stepRetry],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId;
    const project = await step.run("load-project", () => loadProject(projectId));
    if (project.workflow !== "translate") return { skipped: "not a translate project" };
    if (project.status === "completed") return { skipped: "already completed" };
    const input = project.input as TranslateInput;

    /* ---------- 0. optional: remove the on-screen text from the source (once per project) ---------- */
    // Before the text is removed: where was it? Our captions go there later, on a bar (27 Oct 2026).
    const oldTextBox = input.removeText ? await locateOldText(projectId, input, step) : null;
    const sourceAssetId = input.removeText ? await runTextRemoval(projectId, input, step) : input.sourceAssetId;
    // After the removal: the exact place of the smudge, measured from the pictures; the earlier guess is the fallback.
    const coverBox = input.removeText ? ((await measureRemovedTextStep(projectId, input, step)) ?? oldTextBox) : null;

    /* ---------- 1. upload ---------- */
    // Every step that starts a job at the video service waits its turn when the service is full (28 Oct 2026).
    const upload = await untilFree<UploadOutput>(step, "upload", (wait) => step.run(wait === 0 ? "upload" : `upload-${wait}`, () => withDeadline("Uploading the video", 10, async (): Promise<UploadOutput | Busy> => {
      const existing = await loadStep(projectId, "upload");
      if (existing.status === "completed" && typeof existing.output?.heygenAssetId === "string") return existing.output as UploadOutput;
      const row = await markProcessing(projectId, "upload");
      try {
        const source = await loadAsset(sourceAssetId);
        const bytes = await downloadAsset(source);
        const asset = await withRetries("Sending the video to the translation service", () =>
          uploadHeygenAsset({ file: new Blob([bytes as BlobPart], { type: source.mime || "video/mp4" }), filename: input.sourceFileName || "source.mp4" }),
        );
        // For "keep original format" we need the real dimensions; Shotstack's ingest tells us (free).
        let width: number | undefined = source.width ?? undefined;
        let height: number | undefined = source.height ?? undefined;
        if (input.format === "original" && (!width || !height)) {
          const probed = await withRetries("Reading the video dimensions", () => ingestFromUrl(asset.url));
          width = probed.width;
          height = probed.height;
        }
        const output: UploadOutput = { heygenAssetId: asset.asset_id, heygenUrl: asset.url, width: width ?? null, height: height ?? null };
        await markCompleted(projectId, "upload", { output: output as unknown as Record<string, unknown>, externalJobId: asset.asset_id, costUsd: 0 });
        void row;
        return output;
      } catch (error) {
        const busy = busySeconds(error);
        if (busy !== null) return { busy };
        return failStep(projectId, "upload", error);
      }
    })));

    /* ---------- 2. translate (proofread sessions) ---------- */
    const sessions = await runTranslate(projectId, input, upload, step);

    /* ---------- 4. render + enhance + captions, per language ---------- */
    const results = await runCaptions(projectId, { ...input, oldTextBox: coverBox }, upload, sessions, step);
    await step.run("complete", async () => {
      await db().update(projects).set({ status: "completed", updatedAt: new Date() }).where(eq(projects.id, projectId));
      await settleProjectCredits(projectId);
      // The "ready" e-mail, outgoing webhooks and the batch status, as for a finished ad (was missing until 25 Oct 2026).
      await afterProjectEnd(projectId);
    });
    return { projectId, results };
  },
);

type UploadOutput = { heygenAssetId: string; heygenUrl: string; width: number | null; height: number | null };
type SessionMap = Record<string, string>; // language code (or "transcript") → proofread id

/* ---------- translate ---------- */

async function runTranslate(projectId: string, input: TranslateInput, upload: UploadOutput, step: StepTools): Promise<SessionMap> {
  const key = "translate";
  const existing = await step.run("translate-check", () => loadStep(projectId, key));
  if (existing.status === "completed" && existing.output?.sessions) return existing.output.sessions as SessionMap;

  type Started = { direct: boolean; sessions: SessionMap; entryIds: string[]; estimate: number; perLanguage: number; stepId: string; glossaryWarning: string | null };
  const started = await untilFree<Started>(step, "translate-submit", (wait) => step.run(wait === 0 ? "translate-submit" : `translate-submit-${wait}`, () => withDeadline("Starting the translation", 5, async (): Promise<Started | Busy> => {
    const row = await markProcessing(projectId, key);
    try {
      const matched = matchLanguages(await withRetries("Listing languages", () => listTranslationLanguages()));
      const source = input.sourceLanguage !== "auto" ? input.sourceLanguage : null;
      const outputs: { code: string; heygen: string }[] = [];
      for (const code of input.targetLanguages) {
        if (code === source) continue;
        const heygen = matched[code];
        if (!heygen) throw new StepFailure(`${languageOf(code).label} is not available as a target language.`);
        outputs.push({ code, heygen });
      }
      if (source && matched[source]) outputs.push({ code: "transcript", heygen: matched[source]! });

      // Terms that must stay untranslated: a brand glossary (free) attached to the proofread.
      let brandGlossaryId: string | undefined;
      let glossaryWarning: string | undefined;
      const keepTerms = (input.keepTerms ?? []).map((x) => x.trim()).filter(Boolean);
      const replaceTerms = input.replaceTerms ?? [];
      const targetCodes = outputs.filter((o) => o.code !== "transcript").map((o) => o.code);
      const prepared = keepTerms.length || replaceTerms.length ? await prepareTerms(projectId, row.id, input, targetCodes) : { localized: null, pronunciations: null };
      if (keepTerms.length || replaceTerms.length) {
        try {
          // The account's one glossary holds the words of every project running now (28 Oct 2026), so videos made at the same time never take each other's words away.
          const merged = mergeGlossaries({ keep: keepTerms, replace: glossaryReplacements(replaceTerms, prepared.localized, targetCodes), pronounce: glossaryPronunciations(prepared.pronunciations, targetCodes) }, await runningGlossaries(projectId));
          // A refused pronunciation list must never cost the replacements: try once more without it.
          brandGlossaryId = await withRetries("Saving the terms to keep", () => applyBrandGlossary({ doNotTranslate: merged.keep, replace: merged.replace, pronounce: merged.pronounce })).catch((error) => {
            if (!merged.pronounce.length) throw error;
            console.error("[glossary] pronunciations refused, saving without them", error instanceof Error ? error.message : error);
            return withRetries("Saving the terms to keep", () => applyBrandGlossary({ doNotTranslate: merged.keep, replace: merged.replace }));
          });
        } catch (error) {
          // The provider's words stay in the log; the customer gets a plain line.
          console.error("[glossary]", error instanceof Error ? error.message : error);
          glossaryWarning = "Your words to keep or replace could not be passed to the translation itself; the automatic check still kept them in the captions.";
        }
      }

      // One reservation per output language so the budget per language version applies; the transcript is shared.
      const perLanguage = estimateProofreadUsd(input.sourceSeconds, 1);
      const languageCount = input.targetLanguages.length;
      const entryIds: string[] = [];
      for (const o of outputs) {
        const reserved = await reserveSpend({
          service: "heygen",
          action: "translate_proofread",
          estimatedUsd: perLanguage,
          fingerprintInput: { projectId, attempt: row.attempt, output: o.code },
          projectId,
          stepId: row.id,
          language: o.code === "transcript" ? null : o.code,
          languageCount,
          meta: { output: o.code, mode: input.quality },
        }).catch(async (error) => {
          for (const id of entryIds) await settleSpend(id, { status: "failed", actualUsd: 0 });
          throw error;
        });
        entryIds.push(reserved.entryId);
      }
      try {
        const created = await withRetries("Starting the translation", () =>
          createProofread({ video: { assetId: upload.heygenAssetId }, outputLanguages: outputs.map((o) => o.heygen), mode: input.quality, title: `Clipelle ${projectId.slice(0, 8)}`, brandGlossaryId, removeMusic: input.removeMusic, cleanVoice: input.cleanVoice, naturalPace: input.naturalPace, idempotencyKey: `${projectId}:proofread:${row.attempt}${wait ? `:${wait}` : ""}` }),
        );
        const sessions: SessionMap = {};
        outputs.forEach((o, i) => {
          sessions[o.code] = created.proofread_ids[i];
        });
        if (Object.values(sessions).some((id) => !id)) throw new StepFailure("The translation service returned fewer sessions than languages.");
        for (const code of input.targetLanguages) {
          if (sessions[code]) await db().update(translations).set({ proofreadId: sessions[code], status: "processing", updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
        }
        return { direct: false, sessions, entryIds, estimate: perLanguage * outputs.length, perLanguage, stepId: row.id, glossaryWarning: glossaryWarning ?? null };
      } catch (error) {
        for (const id of entryIds) await settleSpend(id, { status: "failed", actualUsd: 0 });
        if (!isPlanRestriction(error)) throw error;
      }

      // Fallback (25 Oct 2026): the account may not use proofreading. Translate directly, one paid
      // render per language now; the quality check runs on the returned subtitles after the render.
      const targets = outputs.filter((o) => o.code !== "transcript");
      const generateEstimate = estimateGenerateUsd(input.sourceSeconds, input.quality);
      const reservedDirect: string[] = [];
      for (const o of targets) {
        const reserved = await reserveSpend({ service: "heygen", action: "translate_generate", estimatedUsd: generateEstimate, fingerprintInput: { projectId, attempt: row.attempt, output: o.code, direct: true }, projectId, stepId: row.id, language: o.code, languageCount, meta: { language: o.code, mode: input.quality, direct: true } }).catch(async (error) => {
          for (const id of reservedDirect) await settleSpend(id, { status: "failed", actualUsd: 0 });
          throw error;
        });
        reservedDirect.push(reserved.entryId);
      }
      try {
        const created = await withRetries("Starting the translation", () =>
          createDirectTranslation({ video: { assetId: upload.heygenAssetId }, outputLanguages: targets.map((o) => o.heygen), mode: input.quality, title: `Clipelle ${projectId.slice(0, 8)}`, inputLanguage: source ? (matched[source] ?? undefined) : undefined, brandGlossaryId, removeMusic: input.removeMusic, cleanVoice: input.cleanVoice, callbackUrl: callbackUrlFor("heygen"), idempotencyKey: `${projectId}:direct:${row.attempt}${wait ? `:${wait}` : ""}` }),
        );
        const sessions: SessionMap = {};
        targets.forEach((o, i) => {
          const id = created.video_translation_ids[i];
          if (id) sessions[o.code] = directSession(id, reservedDirect[i], generateEstimate);
        });
        if (Object.keys(sessions).length !== targets.length) throw new StepFailure("The translation service returned fewer translations than languages.");
        for (const o of targets) {
          const parsed = parseDirectSession(sessions[o.code])!;
          await db().update(translations).set({ translationId: parsed.translationId, status: "processing", updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, o.code)));
        }
        return { direct: true, sessions, entryIds: [], estimate: 0, perLanguage: 0, stepId: row.id, glossaryWarning: glossaryWarning ?? null };
      } catch (error) {
        for (const id of reservedDirect) await settleSpend(id, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      const busy = busySeconds(error);
      if (busy !== null) return { busy };
      return failStep(projectId, key, error);
    }
  })));

  // Direct fallback: no proofread sessions to wait for; the render and the check happen per language.
  if (started.direct) {
    await step.run("translate-direct", () => markCompleted(projectId, key, { output: { sessions: started.sessions, mode: "direct", warning: DIRECT_WARNING }, costUsd: 0 }));
    return started.sessions as SessionMap;
  }

  // Poll every session until all are completed.
  const sessionMap = started.sessions as SessionMap;
  const ids: string[] = Object.values(sessionMap);
  for (let i = 0; i < MAX_POLLS; i++) {
    type SessionStatus = { sessionId: string; status: string; input_language: string | null; failure_message: string | null };
    const statuses: SessionStatus[] = await step.run(`translate-status-${i}`, async () =>
      Promise.all(
        ids.map(async (id) => {
          const p = await getProofread(id);
          return { sessionId: id, status: p.status, input_language: p.input_language ?? null, failure_message: p.failure_message ?? null };
        }),
      ),
    );
    const failed = statuses.find((s) => s.status === "failed");
    if (failed) {
      await step.run("translate-failed", async () => {
        for (const id of started.entryIds) await settleSpend(id, { status: "failed", actualUsd: 0 });
        return failStep(projectId, key, new StepFailure(`The translation failed: ${failed.failure_message ?? "unknown reason"}.`));
      });
    }
    if (statuses.every((s) => s.status === "completed")) {
      await step.run("translate-store", () => withDeadline("Saving the translation", 10, async () => {
        try {
          const cuesBy: Record<string, SrtCue[]> = {};
          let originalCues: SrtCue[] = [];
          for (const [code, id] of Object.entries(sessionMap)) {
            const srt = await withRetries("Downloading the subtitles", () => downloadProofreadSrt(id));
            cuesBy[code] = parseSrt(await fetchSrtText(srt.srt_url));
            // The service also returns the source-language subtitles of every session, free and on the same
            // timing (28 Oct 2026). With "Detect automatically" there is no transcript session, so without
            // this the quality check never saw the source and could not tell what was left out.
            if (!originalCues.length && srt.original_srt_url) originalCues = parseSrt(await fetchSrtText(srt.original_srt_url)).filter((c) => c.text.trim());
          }
          const transcript = cuesBy.transcript?.length ? cuesBy.transcript : originalCues;
          const detected = statuses.find((s) => s.input_language)?.input_language ?? null;
          const detectedCode = languageCodeForName(detected);
          const sourceLanguage = detectedCode ?? (input.sourceLanguage !== "auto" ? input.sourceLanguage : null);
          let checkCost = 0;
          for (const code of input.targetLanguages) {
            const cues = cuesBy[code];
            if (!cues) continue;
            const originals = alignOriginalText(cues, transcript);
            const segments: Segment[] = cues.map((c, i) => ({ index: c.index, start: c.start, end: c.end, original: originals[i] ?? "", translated: c.text, text: c.text }));
            const [row] = await db().update(translations).set({ segments, status: "processing", updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code))).returning();
            // Automatic quality check (replaces the manual review): corrected lines go back into the segments.
            const checked = await checkLanguage(projectId, started.stepId, row, input, transcript.length ? sourceLanguage : null, input.targetLanguages.length);
            checkCost += checked.qa.costUsd;
            await db().update(translations).set({ segments: checked.segments, qa: checked.qa, updatedAt: new Date() }).where(eq(translations.id, row.id));
          }
          await db().update(projects).set({ detectedLanguage: sourceLanguage, updatedAt: new Date() }).where(eq(projects.id, projectId));
          for (const id of started.entryIds) await settleSpend(id, { status: "completed", actualUsd: started.perLanguage });
          await markCompleted(projectId, key, { output: { sessions: sessionMap, ...(started.glossaryWarning ? { warning: started.glossaryWarning } : {}) }, costUsd: started.estimate + checkCost });
        } catch (error) {
          return failStep(projectId, key, error);
        }
      }));
      return sessionMap;
    }
    await step.sleep(`translate-wait-${i}`, `${cfg.pollSeconds}s`);
  }
  return step.run("translate-timeout", () => failStep(projectId, key, new StepFailure(`The translation took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`)));
}

/** Shown on a language version made without proofreading (the fallback of 25 Oct 2026). */
const DIRECT_WARNING = "Proofreading was not available for this account, so the voice follows the translation service's own text. The captions on screen were checked line by line.";

/** Adds a warning to a language version's quality report. */
async function addLanguageWarning(translationId: string, warning: string) {
  const [t] = await db().select({ qa: translations.qa }).from(translations).where(eq(translations.id, translationId)).limit(1);
  const qa = t?.qa ?? { changes: [], warnings: [] };
  if (qa.warnings.includes(warning)) return;
  await db().update(translations).set({ qa: { ...qa, warnings: [...qa.warnings, warning] }, updatedAt: new Date() }).where(eq(translations.id, translationId));
}

/* ---------- words to replace, in each target language (28 Oct 2026) ---------- */

/**
 * The customer's replacements said in every target language (brand and product names stay as
 * written) and one fixed way to say each name per language, stored on the project so a retry does
 * not pay again. Any failure falls back to the customer's own text and no pronunciations.
 */
async function prepareTerms(projectId: string, stepId: string, input: TranslateInput, targets: LanguageCode[]): Promise<{ localized: LocalizedReplacements | null; pronunciations: Pronunciations | null }> {
  if (input.replaceTermsLocalized !== undefined && input.termPronunciations !== undefined) return { localized: input.replaceTermsLocalized ?? null, pronunciations: input.termPronunciations ?? null };
  let localized: LocalizedReplacements | null = null;
  let pronunciations: Pronunciations | null = null;
  try {
    const reserved = await reserveSpend({ service: "anthropic", action: "localize_terms", estimatedUsd: LOCALIZE_TERMS_USD, fingerprintInput: { projectId, terms: input.replaceTerms, keep: input.keepTerms, targets }, projectId, stepId, languageCount: Math.max(1, targets.length), meta: { model: cfg.rewriteModel, terms: input.replaceTerms?.length ?? 0, keep: input.keepTerms?.length ?? 0 } });
    try {
      const result = await withRetries("Preparing your words", () => localizeReplacements({ replace: input.replaceTerms ?? [], keep: input.keepTerms, targets }));
      await settleSpend(reserved.entryId, { status: "completed", actualUsd: result.costUsd, basis: "tokens" });
      localized = input.replaceTerms?.length ? result.localized : null;
      pronunciations = result.pronunciations;
    } catch (error) {
      await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
      throw error;
    }
  } catch (error) {
    console.error("[prepare terms]", error instanceof Error ? error.message : error);
  }
  await db().update(projects).set({ input: sql`${projects.input} || ${JSON.stringify({ replaceTermsLocalized: localized, termPronunciations: pronunciations })}::jsonb`, updatedAt: new Date() }).where(eq(projects.id, projectId));
  return { localized, pronunciations };
}

/** The glossary entries of every other translation running now that has words of its own. */
async function runningGlossaries(projectId: string): Promise<GlossaryEntries[]> {
  const since = new Date(Date.now() - 3 * 3600_000);
  const rows = await db()
    .select({ id: projects.id, input: projects.input })
    .from(projects)
    .where(and(eq(projects.workflow, "translate"), eq(projects.status, "processing"), gte(projects.updatedAt, since), ne(projects.id, projectId)));
  return rows.flatMap((r) => {
    const i = r.input as TranslateInput;
    const keep = (i.keepTerms ?? []).map((x) => x.trim()).filter(Boolean);
    if (!keep.length && !i.replaceTerms?.length) return [];
    return [{ keep, replace: glossaryReplacements(i.replaceTerms ?? [], i.replaceTermsLocalized, i.targetLanguages), pronounce: glossaryPronunciations(i.termPronunciations, i.targetLanguages) }];
  });
}

/* ---------- quality check (replaces the manual review, 2026-10-20) ---------- */

/**
 * Claude compares every line with the source transcript, fixes missing/added words, wrong numbers,
 * names and unnatural sentences within the timing, and records changes and warnings on the
 * translation row. Costs are tiny (Sonnet, cents) and go through the cost guard per language.
 */
async function checkLanguage(projectId: string, stepId: string, t: TranslationRow, input: TranslateInput, sourceLanguage: LanguageCode | null, languageCount: number) {
  if (t.segments.length === 0) return { segments: t.segments, qa: { changes: [], warnings: ["No subtitle lines were returned, so nothing could be checked."], costUsd: 0 } };
  const estimate = Math.max(0.005, estimateCheckUsd(t.segments));
  const reserved = await reserveSpend({ service: "anthropic", action: "translate_check", estimatedUsd: estimate, fingerprintInput: { projectId, language: t.language, text: t.segments.map((s) => s.text) }, projectId, stepId, language: t.language, languageCount, meta: { model: cfg.rewriteModel, lines: t.segments.length } });
  try {
    // The replacements in this language (stored by the translate step, read fresh: the run's input is older).
    const [fresh] = input.replaceTerms?.length ? await db().select({ input: projects.input }).from(projects).where(eq(projects.id, projectId)).limit(1) : [];
    const localized = (fresh?.input as TranslateInput | undefined)?.replaceTermsLocalized;
    const result = await withRetries("Checking the translation", () => checkTranslation({ segments: t.segments, sourceLanguage, targetLanguage: t.language, keepTerms: input.keepTerms, replaceTerms: replacementsFor(t.language, input.replaceTerms, localized), instructions: input.instructions, naturalPace: input.naturalPace }));
    await settleSpend(reserved.entryId, { status: "completed", actualUsd: result.costUsd, basis: "tokens", meta: { usage: result.usage, changes: result.changes.length } });
    return { segments: result.segments, qa: { changes: result.changes, warnings: result.warnings, summary: result.summary, costUsd: result.costUsd } };
  } catch (error) {
    await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
    // The check is a safety net, never a blocker: keep the literal translation and tell the customer.
    return { segments: t.segments, qa: { changes: [], warnings: [`The automatic check could not run (${plainMessage(error)}); the literal translation was used.`], costUsd: 0 } };
  }
}

/* ---------- where the old caption text was (27 Oct 2026) ---------- */

/**
 * Two frames of the source (first, middle) and one vision check: the box of the burned-in caption
 * text, stored on the project so a retry does not pay again. Any failure only means the captions
 * keep their normal place; the translation never stops for this.
 */
async function locateOldText(projectId: string, input: TranslateInput, step: StepTools): Promise<TextBox | null> {
  if (input.oldTextBox !== undefined) return input.oldTextBox;
  return step.run("locate-old-text", () => withDeadline("Finding the old text", 3, async () => {
    let box: TextBox | null = null;
    try {
      const row = await loadStep(projectId, "upload");
      const source = await loadAsset(input.sourceAssetId);
      const url = await providerUrl(source);
      const reservedFrames = await reserveSpend({ service: "fal", action: "extract_frame", estimatedUsd: EXTRACT_FRAME_USD * 3, fingerprintInput: { projectId, source: source.id }, projectId, stepId: row.id, languageCount: Math.max(1, input.targetLanguages.length) });
      let frames: string[] = [];
      try {
        // Three moments, so the box covers the widest old line, not just two of them.
        frames = await Promise.all([extractFrame(url, "first"), extractFrame(url, "middle"), extractFrame(url, "last")]);
        await settleSpend(reservedFrames.entryId, { status: "completed", actualUsd: EXTRACT_FRAME_USD * 3, basis: "list" });
      } catch (error) {
        await settleSpend(reservedFrames.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
      const reservedLook = await reserveSpend({ service: "anthropic", action: "locate_text", estimatedUsd: LOCATE_TEXT_USD, fingerprintInput: { projectId, frames: frames.length }, projectId, stepId: row.id, languageCount: Math.max(1, input.targetLanguages.length) });
      try {
        const found = await locateBurnedCaptions(frames);
        box = found.box;
        await settleSpend(reservedLook.entryId, { status: "completed", actualUsd: found.costUsd, basis: "tokens" });
      } catch (error) {
        await settleSpend(reservedLook.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      console.error("[locate old text]", error instanceof Error ? error.message : error);
      box = null;
    }
    await db().update(projects).set({ input: sql`${projects.input} || ${JSON.stringify({ oldTextBox: box })}::jsonb`, updatedAt: new Date() }).where(eq(projects.id, projectId));
    return box;
  }));
}

/**
 * Where the removal changed the picture (27 Oct 2026): three frames of the source and of the cleaned
 * picture, compared pixel by pixel, give the exact band of the smudge, so the caption bar always
 * lands on it. Stored on the project so a retry does not grab the frames again; any failure falls
 * back to the box found before the removal.
 */
async function measureRemovedTextStep(projectId: string, input: TranslateInput, step: StepTools): Promise<TextBox | null> {
  if (input.removedTextBox !== undefined) return input.removedTextBox;
  return step.run("measure-removed-text", () => withDeadline("Finding the cleaned spot", 6, async () => {
    let box: TextBox | null = null;
    try {
      const [picture] = await db().select({ id: assets.id }).from(assets).where(and(eq(assets.projectId, projectId), eq(assets.kind, "cleaned"), sql`(${assets.storagePath} like '%cleaned-picture%' or ${assets.storagePath} like '%-cleaned.mp4')`)).limit(1);
      if (picture) {
        const row = await loadStep(projectId, "upload");
        const [source, cleaned] = await Promise.all([loadAsset(input.sourceAssetId), loadAsset(picture.id)]);
        const estimate = FRAME_AT_USD * MEASURE_MOMENTS * 2;
        const reserved = await reserveSpend({ service: "shotstack", action: "measure_frames", estimatedUsd: estimate, fingerprintInput: { projectId, source: source.id, cleaned: cleaned.id, moments: MEASURE_MOMENTS }, projectId, stepId: row.id, languageCount: Math.max(1, input.targetLanguages.length) });
        try {
          const sourceUrl = await providerUrl(source);
          // "Original": the source's own size (free probe), so the box matches the frame the captions are drawn on.
          let size: { width: number; height: number } | undefined;
          if (input.format === "original") {
            const probed = await ingestFromUrl(sourceUrl).catch(() => null);
            if (probed?.width && probed.height) {
              const scale = 640 / Math.max(probed.width, probed.height);
              size = { width: Math.round((probed.width * scale) / 2) * 2, height: Math.round((probed.height * scale) / 2) * 2 };
            }
          }
          box = await measureRemovedText(sourceUrl, await providerUrl(cleaned), input.sourceSeconds, size);
          await settleSpend(reserved.entryId, { status: "completed", actualUsd: estimate, basis: "list" });
        } catch (error) {
          await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
          throw error;
        }
      }
    } catch (error) {
      console.error("[measure removed text]", error instanceof Error ? error.message : error);
      box = null;
    }
    await db().update(projects).set({ input: sql`${projects.input} || ${JSON.stringify({ removedTextBox: box })}::jsonb`, updatedAt: new Date() }).where(eq(projects.id, projectId));
    return box;
  }));
}

/* ---------- optional: remove the on-screen text ---------- */

/**
 * Removes text burned into the source picture before anything is translated (26 Oct 2026), shown to
 * the customer as part of the Upload step. Reuses a cleaned file when a retry finds one; paid
 * through the cost guard and settled with the real GPU time.
 */
async function runTextRemoval(projectId: string, input: TranslateInput, step: StepTools): Promise<string> {
  const existing = await step.run("clean-existing", async () => {
    // Only the finished file (cleaned picture with the original sound) counts; the silent picture is an in-between.
    const [a] = await db().select({ id: assets.id }).from(assets).where(and(eq(assets.projectId, projectId), eq(assets.kind, "cleaned"), sql`${assets.storagePath} like '%cleaned-with-sound%'`)).limit(1);
    return a?.id ?? null;
  });
  if (existing) return existing;
  // A retry after the sound step: the cleaned picture is already paid for and stored, so only the sound goes back.
  const picture = await step.run("clean-picture-existing", async () => {
    const [a] = await db().select({ id: assets.id, stepId: assets.stepId }).from(assets).where(and(eq(assets.projectId, projectId), eq(assets.kind, "cleaned"), sql`(${assets.storagePath} like '%cleaned-picture%' or ${assets.storagePath} like '%-cleaned.mp4')`)).limit(1);
    if (!a) return null;
    const row = await markProcessing(projectId, "upload");
    return { id: a.id, stepId: a.stepId ?? row.id };
  });
  if (picture) return restoreSound(projectId, input, picture.id, picture.stepId, step, (message) => step.run("clean-failed", () => failStep(projectId, "upload", new StepFailure(message))));
  const job = await step.run("clean-submit", () => withDeadline("Starting the text removal", 5, async (): Promise<{ predictionId: string; entryId: string; estimate: number; stepId: string } | { error: string }> => {
    try {
      const row = await markProcessing(projectId, "upload");
      const source = await loadAsset(input.sourceAssetId);
      const estimate = estimateTextRemovalUsd(input.sourceSeconds);
      const reserved = await reserveSpend({ service: "replicate", action: "remove_text", estimatedUsd: estimate, fingerprintInput: { projectId, source: source.id, attempt: row.attempt }, projectId, stepId: row.id, languageCount: Math.max(1, input.targetLanguages.length), meta: { model: TEXT_REMOVAL_MODEL, seconds: input.sourceSeconds } });
      try {
        const r = await withRetries("Starting the text removal", async () => startTextRemoval({ videoUrl: await providerUrl(source) }));
        return { predictionId: r.predictionId, entryId: reserved.entryId, estimate, stepId: row.id };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return { error: plainMessage(error) };
    }
  }));
  const failClean = (message: string) => step.run("clean-failed", () => failStep(projectId, "upload", new StepFailure(message)));
  if ("error" in job) return failClean(job.error);
  for (let i = 0; i < MAX_POLLS; i++) {
    const st = await step.run(`clean-status-${i}`, () => getTextRemoval(job.predictionId));
    if (st.status === "done") {
      const stored = await step.run("clean-store", () => withDeadline("Saving the cleaned video", 10, async (): Promise<{ assetId: string } | { error: string }> => {
        try {
          const bytes = await downloadTextRemovalOutput(st.outputUrl);
          const asset = await storeBytes({ projectId, stepId: job.stepId, kind: "cleaned", data: bytes, mime: "video/mp4", fileName: "cleaned-picture.mp4", seconds: input.sourceSeconds });
          const actual = st.gpuSeconds !== null ? Math.round(st.gpuSeconds * TEXT_REMOVAL_USD_PER_GPU_SECOND * 1000) / 1000 : job.estimate;
          await settleSpend(job.entryId, { status: "completed", actualUsd: actual, basis: st.gpuSeconds !== null ? "provider" : "list", meta: { gpuSeconds: st.gpuSeconds } });
          return { assetId: asset.id };
        } catch (error) {
          return { error: plainMessage(error) };
        }
      }));
      if ("error" in stored) return failClean(stored.error);
      return restoreSound(projectId, input, stored.assetId, job.stepId, step, failClean);
    }
    if (st.status === "failed") {
      await step.run("clean-settle-failed", () => settleSpend(job.entryId, { status: "failed", actualUsd: st.gpuSeconds !== null ? Math.round(st.gpuSeconds * TEXT_REMOVAL_USD_PER_GPU_SECOND * 1000) / 1000 : 0 }));
      console.error(`[text removal] prediction failed: ${st.error}`);
      return failClean("The on-screen text could not be removed from this video. Retry, or start again without this option.");
    }
    await step.sleep(`clean-wait-${i}`, `${cfg.pollSeconds}s`);
  }
  return failClean(`Removing the on-screen text took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);
}

/* ---------- AI presenter, per language (26 Oct 2026) ---------- */

/**
 * The checked translation spoken by the presenter the customer picked (voice, accent, speed), then
 * captions from the presenter's own audio in the chosen layout. Paid calls through the cost guard;
 * a failure ends only this language.
 */
async function processPresenterLanguage(projectId: string, input: TranslateInput, code: LanguageCode, proofreadId: string, languageCount: number, step: StepTools, budgetMessage: (error: unknown) => string): Promise<LanguageOutcome> {
  const lang = languageOf(code).tag;
  const fail = (message: string): LanguageOutcome => ({ ok: false, error: message });
  const p = input.presenter!;

  // a. The presenter video, from the checked lines.
  type Job = { done: true; assetId: string } | { done: false; videoId: string; entryId: string; estimate: number; stepId: string } | { error: string };
  const job = await untilFree<Job>(step, `${code}-presenter-submit`, (wait) => step.run(wait === 0 ? `${code}-presenter-submit` : `${code}-presenter-submit-${wait}`, () => withDeadline("Starting the presenter video", 5, async (): Promise<Job | Busy> => {
    try {
      const [t] = await db().select().from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, code))).limit(1);
      if (!t) throw new LanguageFailure(`No translation row for ${lang}.`);
      if (t.captionedAssetId) return { done: true, assetId: t.captionedAssetId };
      if (parseDirectSession(proofreadId)) throw new LanguageFailure("The AI presenter needs the checked translation first, and this account's translation service did not return it. Translate with the original speaker instead.");
      const script = t.segments.map((x) => x.text.trim()).filter(Boolean).join(" ");
      if (!script) throw new LanguageFailure(`There is no translated text for ${lang} to speak.`);
      const stepRow = await loadStep(projectId, "captions");
      const { lookId, voiceId } = await pickPresenter(p.engine, p.lookId, { language: code, accent: p.accent, voiceId: p.voiceId } as AdInput);
      const seconds = estimateSeconds(script);
      const estimate = estimateCostUsd(p.engine, seconds);
      const reserved = await reserveSpend({ service: "heygen", action: "avatar_video", estimatedUsd: estimate, fingerprintInput: { projectId, code, attempt: stepRow.attempt, ...(wait ? { wait } : {}) }, projectId, stepId: stepRow.id, language: code, languageCount, meta: { engine: p.engine, resolution: cfg.heygenResolution, seconds } });
      try {
        const speed = speedValue(p.speed);
        const created = await withRetries("Starting the presenter video", () =>
          createAvatarVideo({ avatarId: lookId, voiceId, script, engine: p.engine, resolution: cfg.heygenResolution, fit: "cover", voiceSettings: speed !== 1 ? { speed } : undefined, title: `Clipelle ${projectId.slice(0, 8)} ${code}`, idempotencyKey: reserved.fingerprint }),
        );
        await db().update(translations).set({ status: "processing", error: null, updatedAt: new Date() }).where(eq(translations.id, t.id));
        return { done: false, videoId: created.video_id, entryId: reserved.entryId, estimate, stepId: stepRow.id };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      const busy = busySeconds(error);
      if (busy !== null) return { busy };
      return { error: budgetMessage(error) };
    }
  })));
  if ("error" in job) return fail(job.error);
  if (!job.done) await step.run(`${code}-phase-voice`, () => setLanguagePhase(projectId, code, "voice"));
  if (job.done) return { ok: true, assetId: job.assetId };

  let presenterAssetId = "";
  let presenterSeconds = input.sourceSeconds;
  for (let i = 0; i < MAX_POLLS && !presenterAssetId; i++) {
    const video = await step.run(`${code}-presenter-status-${i}`, () => getVideo(job.videoId));
    if (video.status === "completed" && video.video_url) {
      const stored = await step.run(`${code}-presenter-store`, () => withDeadline("Saving the presenter video", 10, async (): Promise<{ assetId: string; seconds: number } | { error: string }> => {
        try {
          const asset = await storeFromUrl({ projectId, stepId: job.stepId, kind: "presenter", url: video.video_url!, fileName: `presenter-${code}.mp4`, language: code, seconds: video.duration ?? undefined, fallbackMime: "video/mp4" });
          await db().update(translations).set({ videoAssetId: asset.id, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
          await settleSpend(job.entryId, { status: "completed", actualUsd: video.duration ? estimateCostUsd(p.engine, video.duration) : job.estimate, basis: "list", meta: { durationSeconds: video.duration ?? null, videoId: job.videoId } });
          return { assetId: asset.id, seconds: video.duration ?? input.sourceSeconds };
        } catch (error) {
          return { error: budgetMessage(error) };
        }
      }));
      if ("error" in stored) return fail(stored.error);
      presenterAssetId = stored.assetId;
      presenterSeconds = stored.seconds;
      break;
    }
    if (video.status === "failed") {
      await step.run(`${code}-presenter-failed`, () => settleSpend(job.entryId, { status: "failed", actualUsd: 0 }));
      return fail(`The ${lang} presenter video could not be made: ${video.failure_message ?? video.failure_code ?? "unknown reason"}.`);
    }
    await waitForJob(step, `${code}-presenter-wait-${i}`, "heygen", job.videoId, cfg.pollSeconds);
  }
  if (!presenterAssetId) return fail(`The ${lang} presenter video took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);

  // b. Captions (and the customer's video behind, when chosen) via Shotstack.
  const render = await step.run(`${code}-presenter-edit-submit`, () => withDeadline("Starting the captions", 10, async (): Promise<{ renderId: string; entryId: string; estimate: number; stepId: string; seconds: number } | { error: string }> => {
    try {
      const stepRow = await loadStep(projectId, "captions");
      const presenter = await loadAsset(presenterAssetId);
      let sourceUrl: string | undefined;
      if (p.layout === "overlay") {
        const [cleaned] = await db().select().from(assets).where(and(eq(assets.projectId, projectId), eq(assets.kind, "cleaned"))).limit(1);
        sourceUrl = await providerUrl(cleaned ?? (await loadAsset(input.sourceAssetId)));
      }
      const edit = buildPresenterTranslateEdit({ presenterUrl: await providerUrl(presenter), presenterSeconds, layout: p.layout, sourceUrl, sourceSeconds: input.sourceSeconds, captionPosition: input.captionPosition ?? "low", captionStyle: input.captionStyle });
      const estimate = Math.round(edit.meta.totalSeconds * SHOTSTACK_USD_PER_SECOND * 1000) / 1000;
      const reserved = await reserveSpend({ service: "shotstack", action: "translate_captions", estimatedUsd: estimate, fingerprintInput: { projectId, code, video: presenter.id }, projectId, stepId: stepRow.id, language: code, languageCount, meta: { env: shotstackEnv(), layout: p.layout } });
      try {
        const r = await withRetries("Starting the captions", () => startRender(edit, callbackUrlFor("shotstack")));
        return { renderId: r.renderId, entryId: reserved.entryId, estimate, stepId: stepRow.id, seconds: edit.meta.totalSeconds };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return { error: budgetMessage(error) };
    }
  }));
  if ("error" in render) return fail(render.error);
  await step.run(`${code}-phase-captions`, () => setLanguagePhase(projectId, code, "captions"));

  for (let i = 0; i < MAX_POLLS; i++) {
    const r = await step.run(`${code}-presenter-edit-status-${i}`, async () => {
      const x = await getRender(render.renderId);
      return { status: x.status, url: x.url ?? null, duration: x.duration ?? null, error: x.error ?? null };
    });
    if (r.status === "done" && r.url) {
      const stored = await step.run(`${code}-presenter-edit-store`, () => withDeadline("Saving the final video", 10, async (): Promise<{ assetId: string } | { error: string }> => {
        try {
          const asset = await storeFromUrl({ projectId, stepId: render.stepId, kind: "captioned", url: r.url!, fileName: `final-${code}.mp4`, language: code, seconds: r.duration ?? render.seconds, fallbackMime: "video/mp4" });
          await db().update(translations).set({ captionedAssetId: asset.id, status: "completed", error: null, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
          await settleSpend(render.entryId, { status: "completed", actualUsd: render.estimate });
          await setLanguagePhase(projectId, code, "done");
          return { assetId: asset.id };
        } catch (error) {
          return { error: budgetMessage(error) };
        }
      }));
      if ("error" in stored) return fail(stored.error);
      await requestQualityReport(step, projectId, code);
      return { ok: true, assetId: stored.assetId };
    }
    if (r.status === "failed") {
      await step.run(`${code}-presenter-edit-failed`, () => settleSpend(render.entryId, { status: "failed", actualUsd: 0 }));
      return fail(`Adding captions to the ${lang} video failed: ${r.error || "unknown reason"}.`);
    }
    await waitForJob(step, `${code}-presenter-edit-wait-${i}`, "shotstack", render.renderId, cfg.pollSeconds);
  }
  return fail(`Captions for ${lang} took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);
}

/** The cleaned picture with the original sound back under it (Shotstack), stored as the source for the translation. */
async function restoreSound(projectId: string, input: TranslateInput, pictureAssetId: string, stepId: string, step: StepTools, failClean: (message: string) => Promise<never>): Promise<string> {
  const render = await step.run("clean-sound-submit", () => withDeadline("Restoring the sound", 5, async (): Promise<{ renderId: string; entryId: string; estimate: number } | { error: string }> => {
    try {
      const [picture, source] = await Promise.all([loadAsset(pictureAssetId), loadAsset(input.sourceAssetId)]);
      const sourceUrl = await providerUrl(source);
      let size = source.width && source.height ? { width: source.width, height: source.height } : undefined;
      if (!size) {
        const probed = await withRetries("Reading the video dimensions", () => ingestFromUrl(sourceUrl));
        if (probed.width && probed.height) size = { width: probed.width, height: probed.height };
      }
      const edit = buildRemuxEdit({ pictureUrl: await providerUrl(picture), soundUrl: sourceUrl, seconds: input.sourceSeconds, size });
      const estimate = Math.round(edit.meta.totalSeconds * SHOTSTACK_USD_PER_SECOND * 1000) / 1000;
      const reserved = await reserveSpend({ service: "shotstack", action: "restore_sound", estimatedUsd: estimate, fingerprintInput: { projectId, picture: picture.id }, projectId, stepId, languageCount: Math.max(1, input.targetLanguages.length), meta: { env: shotstackEnv() } });
      try {
        const r = await withRetries("Restoring the sound", () => startRender(edit, callbackUrlFor("shotstack")));
        return { renderId: r.renderId, entryId: reserved.entryId, estimate };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return { error: plainMessage(error) };
    }
  }));
  if ("error" in render) return failClean(render.error);
  for (let i = 0; i < MAX_POLLS; i++) {
    const r = await step.run(`clean-sound-status-${i}`, async () => {
      const x = await getRender(render.renderId);
      return { status: x.status, url: x.url ?? null, error: x.error ?? null };
    });
    if (r.status === "done" && r.url) {
      const stored = await step.run("clean-sound-store", () => withDeadline("Saving the cleaned video", 10, async (): Promise<{ assetId: string } | { error: string }> => {
        try {
          const asset = await storeFromUrl({ projectId, stepId, kind: "cleaned", url: r.url!, fileName: "cleaned-with-sound.mp4", seconds: input.sourceSeconds, fallbackMime: "video/mp4" });
          await settleSpend(render.entryId, { status: "completed", actualUsd: render.estimate });
          return { assetId: asset.id };
        } catch (error) {
          return { error: plainMessage(error) };
        }
      }));
      if ("error" in stored) return failClean(stored.error);
      return stored.assetId;
    }
    if (r.status === "failed") {
      await step.run("clean-sound-failed", () => settleSpend(render.entryId, { status: "failed", actualUsd: 0 }));
      return failClean("The sound could not be put back under the cleaned video. Retry, or start again without removing the on-screen text.");
    }
    await waitForJob(step, `clean-sound-wait-${i}`, "shotstack", render.renderId, cfg.pollSeconds);
  }
  return failClean(`Restoring the sound took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);
}

/* ---------- render + enhance + captions, per language ---------- */

/** The translation service holding a video for its own review: a wait, not an error. */
function isModerationHold(message: string | null | undefined) {
  return /moderation|under review|in review/i.test(message ?? "");
}

/** Thrown inside a language's sub-flow: that language stops, the others continue. */
class LanguageFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LanguageFailure";
  }
}

async function markLanguageFailed(projectId: string, code: LanguageCode, message: string) {
  await db().update(translations).set({ status: "failed", error: message, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
}

async function runCaptions(projectId: string, input: TranslateInput, upload: UploadOutput, sessions: SessionMap, step: StepTools) {
  const key = "captions";
  const existing = await step.run("captions-check", () => loadStep(projectId, key));
  if (existing.status === "completed") return existing.output ?? {};

  await step.run("captions-start", () => markProcessing(projectId, key));
  const results: Record<string, string> = {};
  const failures: Record<string, string> = {};
  const languageCount = input.targetLanguages.length;

  // Every language version runs in parallel (2026-10-20); each has its own step ids and its own budget.
  const outcomes = await Promise.all(
    input.targetLanguages
      .filter((code) => sessions[code])
      .map(async (code) => ({ code, outcome: await processLanguage(projectId, input, upload, code, sessions[code], languageCount, step) })),
  );
  for (const { code, outcome } of outcomes) {
    if (outcome.ok) results[code] = outcome.assetId;
    else {
      failures[code] = outcome.error;
      await step.run(`${code}-mark-failed`, () => markLanguageFailed(projectId, code, outcome.error));
    }
  }

  if (Object.keys(results).length === 0) {
    await step.run("captions-all-failed", () => failStep(projectId, key, new StepFailure(Object.values(failures)[0] ?? "No language version could be produced.")));
  }
  await step.run("captions-complete", () => markCompleted(projectId, key, { output: { ...results, failures } }));
  return results;
}

type LanguageOutcome = { ok: true; assetId: string } | { ok: false; error: string };

/**
 * Where a language version is (27 Oct 2026, one progress for the customer): voice → enhance →
 * captions → done, stored on the captions step as `output.phases[code] = { key, at }` with one atomic
 * jsonb merge, so the project page can show a percentage per language without a migration. A write
 * that fails never fails the step: the bar then simply moves on at the next phase.
 */
/**
 * When the captions start and end (shared by the end probe and the captions step, so both use the
 * same times): the video's real length, the cues (checked lines on the delivered timing), and how much
 * silence is cut at the start and end.
 */
async function captionTiming(projectId: string, input: TranslateInput, code: LanguageCode, videoAssetId: string, srtAssetId: string) {
  const video = await loadAsset(videoAssetId);
  const srt = srtAssetId ? await loadAsset(srtAssetId) : null;
  let seconds = video.seconds ?? input.sourceSeconds;
  // Silence at the start and end, read from the subtitle cue times (no audio analysis needed):
  // more than 0.3 s before the first line or after the last line is cut, keeping a 0.3 s breath.
  const [t] = await db().select().from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, code))).limit(1);
  let cues = t?.segments ?? [];
  if (input.naturalPace) {
    // Natural pace (27 Oct 2026): the delivered video may be a little shorter or longer than the source,
    // so its real length is read (free probe) and the captions follow the delivered subtitle times,
    // keeping the checked words when the lines match one to one.
    const probed = await withRetries("Reading the video length", async () => ingestFromUrl(await providerUrl(video))).catch(() => null);
    if (probed?.duration) seconds = probed.duration;
    if (srt) {
      const delivered = parseSrt(await fetchSrtText(await providerUrl(srt))).filter((c) => c.text.trim());
      if (delivered.length) {
        cues = delivered.length === cues.length
          ? delivered.map((c, i) => ({ ...cues[i], start: c.start, end: c.end }))
          : delivered.map((c) => ({ index: c.index, start: c.start, end: c.end, original: "", translated: c.text, text: c.text }));
      }
    }
  }
  let trimStart = 0;
  let trimEnd = 0;
  if ((input.trimSilence ?? false) && cues.length > 0) {
    const first = Math.min(...cues.map((c) => c.start));
    const last = Math.max(...cues.map((c) => c.end));
    if (first > 0.6) trimStart = Math.round((first - 0.3) * 10) / 10;
    if (seconds - last > 0.6) trimEnd = Math.round((seconds - last - 0.3) * 10) / 10;
  }
  const lastEnd = cues.length ? Math.max(...cues.map((c) => c.end)) : seconds;
  const firstStart = cues.length ? Math.min(...cues.map((c) => c.start)) : 0;
  return { video, srt, seconds, cues, trimStart, trimEnd, lastEnd, firstStart };
}

/**
 * Does the silent start or end show a new picture? (28 Oct 2026 for the end, 29 Oct 2026 for the start.)
 * Shotstack renders the silence plus the nearest half second of speech as a 48×86 GIF; firstChange finds a
 * cut or a fade there. True = keep that part; false = it is dead air (or the check could not run).
 * The end keeps its step ids from before (`<code>-end-probe-*`), the start uses `<code>-start-probe-*`.
 */
async function probeKeeps(step: StepTools, projectId: string, input: TranslateInput, code: LanguageCode, videoAssetId: string, srtAssetId: string, languageCount: number, side: "start" | "end"): Promise<boolean> {
  const id = `${code}-${side}-probe`;
  const probe = await step.run(`${id}-submit`, () => withDeadline(side === "end" ? "Looking at the end" : "Looking at the start", 5, async (): Promise<{ renderId: string; entryId: string; estimate: number } | { skip: string }> => {
    try {
      const timing = await captionTiming(projectId, input, code, videoAssetId, srtAssetId);
      if ((side === "end" ? timing.trimEnd : timing.trimStart) <= 0) return { skip: `no silent ${side}` };
      const from = side === "end" ? Math.max(timing.trimStart, timing.lastEnd - 0.5) : 0;
      const length = side === "end" ? Math.min(12, timing.seconds - from) : Math.min(12, timing.firstStart + 0.5);
      if (length < 0.8) return { skip: "too short" };
      const estimate = Math.round(length * SHOTSTACK_USD_PER_SECOND * 1000) / 1000;
      const reserved = await reserveSpend({ service: "shotstack", action: `${side}_probe`, estimatedUsd: estimate, fingerprintInput: { projectId, code, video: videoAssetId, from, side }, projectId, stepId: (await loadStep(projectId, "captions")).id, language: code, languageCount, meta: { env: shotstackEnv(), seconds: length } });
      try {
        const r = await withRetries(side === "end" ? "Looking at the end" : "Looking at the start", async () => startRender(buildEndProbeEdit({ videoUrl: await providerUrl(timing.video), from, length })));
        return { renderId: r.renderId, entryId: reserved.entryId, estimate };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      console.error(`[${side}-probe] skipped`, error);
      return { skip: "error" };
    }
  }));
  if (!("renderId" in probe)) return false;
  for (let i = 0; i < 24; i++) {
    await step.sleep(`${id}-wait-${i}`, "5s");
    const r = await step.run(`${id}-status-${i}`, async () => {
      const x = await getRender(probe.renderId).catch(() => null);
      return { status: x?.status ?? "unknown", url: x?.url ?? null };
    });
    if (r.status === "done" && r.url) {
      return step.run(`${id}-read`, async () => {
        try {
          return firstChange(await gifFrames(r.url!)) !== null;
        } catch (error) {
          console.error(`[${side}-probe] could not read`, error);
          return false;
        } finally {
          await settleSpend(probe.entryId, { status: "completed", actualUsd: probe.estimate });
        }
      });
    }
    if (r.status === "failed") {
      await step.run(`${id}-failed`, () => settleSpend(probe.entryId, { status: "failed", actualUsd: 0 }));
      return false;
    }
  }
  await step.run(`${id}-timeout`, () => settleSpend(probe.entryId, { status: "completed", actualUsd: probe.estimate }));
  return false;
}

/**
 * Asks for the admin-only quality report of a finished language version (28 Oct 2026). Sent from its
 * own step and never allowed to fail the video; QUALITY_REPORTS=off switches it off.
 */
async function requestQualityReport(step: StepTools, projectId: string, code: LanguageCode) {
  if (process.env.QUALITY_REPORTS === "off") return;
  await step.run(`${code}-quality-request`, async () => {
    try {
      await inngest.send(qualityCheckRequested.create({ projectId, language: code }));
      return { sent: true };
    } catch (error) {
      console.error("[quality] report request failed", error);
      return { sent: false };
    }
  });
}

async function setLanguagePhase(projectId: string, code: LanguageCode, key: "voice" | "enhance" | "captions" | "done") {
  try {
    const patch = JSON.stringify({ phases: { [code]: { key, at: new Date().toISOString() } } });
    await db()
      .update(steps)
      .set({ output: sql`jsonb_set(coalesce(${steps.output}, '{}'::jsonb), '{phases}', coalesce(${steps.output} -> 'phases', '{}'::jsonb) || (${patch}::jsonb -> 'phases'))`, updatedAt: new Date() })
      .where(and(eq(steps.projectId, projectId), eq(steps.key, "captions")));
  } catch (error) {
    console.error("[translate] phase write failed", error instanceof Error ? error.message : error);
  }
}

/** Every step of one language version. A LanguageFailure (incl. its budget) ends only this language. */
async function processLanguage(projectId: string, input: TranslateInput, upload: UploadOutput, code: LanguageCode, proofreadId: string, languageCount: number, step: StepTools): Promise<LanguageOutcome> {
  const lang = languageOf(code).tag;
  const fail = (message: string): LanguageOutcome => ({ ok: false, error: message });
  const budgetMessage = (error: unknown) => {
    const e = error as { code?: string; message?: string };
    if (e?.code === "creative_budget" || e?.code === "per_action_limit" || e?.code === "user_limit") {
      console.error(`[cost guard] ${lang}:`, e.message);
      return "This language stopped at our safety limit for a single video, before anything more was charged. It costs no credits; the other languages finish.";
    }
    return error instanceof Error ? error.message : "Unknown error.";
  };

  // "Translate with an AI presenter": a chosen presenter speaks the checked lines instead of a lip-synced render.
  if (input.speaker === "presenter" && input.presenter) return processPresenterLanguage(projectId, input, code, proofreadId, languageCount, step, budgetMessage);

  // a. Approved subtitles back to HeyGen and the paid render.
  type Gen = { translationId: string; entryId: string; estimate: number; done: boolean; direct?: boolean } | { error: string };
  const gen = await untilFree<Gen>(step, `${code}-generate`, (wait) => step.run(wait === 0 ? `${code}-generate` : `${code}-generate-${wait}`, () => withDeadline("Starting the video render", 5, async (): Promise<Gen | Busy> => {
    try {
      const [t] = await db().select().from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, code))).limit(1);
      if (!t) throw new LanguageFailure(`No translation row for ${lang}.`);
      if (t.translationId && t.captionedAssetId) return { translationId: t.translationId, entryId: "", estimate: 0, done: true };
      const direct = parseDirectSession(proofreadId);
      if (direct) return { translationId: direct.translationId, entryId: direct.entryId, estimate: direct.estimate, done: false, direct: true };
      const stepRow = await loadStep(projectId, "captions");
      if (!t.translationId) {
        const srt = buildSrt(t.segments.map((s) => ({ index: s.index, start: s.start, end: s.end, text: s.text })));
        try {
          const srtAsset = await withRetries("Uploading the subtitles", () => uploadHeygenAsset({ file: new Blob([srt], { type: "application/x-subrip" }), filename: `${projectId.slice(0, 8)}-${code}.srt` }));
          await withRetries("Saving the subtitles", () => uploadProofreadSrt(proofreadId, { assetId: srtAsset.asset_id }));
        } catch (error) {
          // Fallback (25 Oct 2026): render with the service's own text; the captions still use the checked lines.
          if (!isPlanRestriction(error)) throw error;
          await addLanguageWarning(t.id, "The translation service did not accept the checked subtitles for this account, so the voice follows its own translation. The captions on screen are the checked lines.");
        }
      }
      const estimate = estimateGenerateUsd(input.sourceSeconds, input.quality);
      // A render that already exists (a retry after a moderation hold or a timeout) is picked up again
      // instead of ordering, and paying for, a second one (27 Oct 2026).
      if (t.translationId) {
        const existing = await getTranslation(t.translationId).catch(() => null);
        if (existing && (existing.status !== "failed" || isModerationHold(existing.failure_message))) {
          const reservedAgain = await reserveSpend({ service: "heygen", action: "translate_generate", estimatedUsd: estimate, fingerprintInput: { projectId, code, attempt: stepRow.attempt, resumed: t.translationId }, projectId, stepId: stepRow.id, language: code, languageCount, meta: { language: code, mode: input.quality, resumed: true } });
          await db().update(translations).set({ status: "processing", error: null, updatedAt: new Date() }).where(eq(translations.id, t.id));
          return { translationId: t.translationId, entryId: reservedAgain.entryId, estimate, done: false };
        }
      }
      const reserved = await reserveSpend({ service: "heygen", action: "translate_generate", estimatedUsd: estimate, fingerprintInput: { projectId, code, attempt: stepRow.attempt, ...(wait ? { wait } : {}) }, projectId, stepId: stepRow.id, language: code, languageCount, meta: { language: code, mode: input.quality } });
      try {
        const created = await withRetries("Starting the translated video", () => generateFromProofread(proofreadId, { idempotencyKey: reserved.fingerprint, callbackUrl: callbackUrlFor("heygen") }));
        await db().update(translations).set({ translationId: created.video_translation_id, status: "processing", error: null, updatedAt: new Date() }).where(eq(translations.id, t.id));
        return { translationId: created.video_translation_id, entryId: reserved.entryId, estimate, done: false };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      const busy = busySeconds(error);
      if (busy !== null) return { busy };
      return { error: budgetMessage(error) };
    }
  })));
  if ("error" in gen) return fail(gen.error);
  if (!gen.done) await step.run(`${code}-phase-voice`, () => setLanguagePhase(projectId, code, "voice"));

  // b. Wait for the translated video; copy it and its SRT into our storage.
  let translatedAssetId = "";
  let srtAssetId = "";
  if (!gen.done) {
    let finished = false;
    for (let i = 0; i < MAX_POLLS && !finished; i++) {
      const tr = await step.run(`${code}-status-${i}`, async () => {
        const t = await getTranslation(gen.translationId);
        return { status: t.status, video_url: t.video_url ?? null, srt_caption_url: t.srt_caption_url ?? null, failure_message: t.failure_message ?? null };
      });
      if (tr.status === "completed" && tr.video_url) {
        const stored = await step.run(`${code}-store`, () => withDeadline("Saving the translated video", 10, async (): Promise<{ videoAssetId: string; srtAssetId: string } | { error: string }> => {
          try {
            const stepRow = await loadStep(projectId, "captions");
            const video = await storeFromUrl({ projectId, stepId: stepRow.id, kind: "translated", url: tr.video_url!, fileName: `translated-${code}.mp4`, language: code, seconds: input.sourceSeconds, fallbackMime: "video/mp4" });
            const srt = tr.srt_caption_url ? await storeFromUrl({ projectId, stepId: stepRow.id, kind: "srt", url: tr.srt_caption_url, fileName: `captions-${code}.srt`, language: code, fallbackMime: "application/x-subrip" }) : null;
            await db().update(translations).set({ videoAssetId: video.id, srtAssetId: srt?.id ?? null, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
            if (gen.entryId) await settleSpend(gen.entryId, { status: "completed", actualUsd: gen.estimate });
            return { videoAssetId: video.id, srtAssetId: srt?.id ?? "" };
          } catch (error) {
            return { error: budgetMessage(error) };
          }
        }));
        if ("error" in stored) return fail(stored.error);
        translatedAssetId = stored.videoAssetId;
        srtAssetId = stored.srtAssetId;
        finished = true;
        if (gen.direct) {
          // No proofread before the render: check the service's subtitles now; the captions use the checked lines.
          await step.run(`${code}-direct-check`, () => withDeadline("Checking the translation", 5, async () => {
            const [t] = await db().select().from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, code))).limit(1);
            if (!t || t.segments.length > 0) return;
            const srt = stored.srtAssetId ? await loadAsset(stored.srtAssetId) : null;
            if (!srt) return addLanguageWarning(t.id, DIRECT_WARNING);
            const cues = parseSrt(await fetchSrtText(await providerUrl(srt)));
            const segments: Segment[] = cues.map((c) => ({ index: c.index, start: c.start, end: c.end, original: "", translated: c.text, text: c.text }));
            const [row] = await db().update(translations).set({ segments, updatedAt: new Date() }).where(eq(translations.id, t.id)).returning();
            const stepRow = await loadStep(projectId, "captions");
            const checked = await checkLanguage(projectId, stepRow.id, row, input, null, languageCount);
            await db().update(translations).set({ segments: checked.segments, qa: { ...checked.qa, warnings: [DIRECT_WARNING, ...checked.qa.warnings] }, updatedAt: new Date() }).where(eq(translations.id, t.id));
          }));
        }
        break;
      }
      // "Pending moderation" (27 Oct 2026): the service holds the video for its own review and then goes on
      // ("running" again a little later). That is waiting, not a failure: keep checking.
      if (tr.status === "failed" && isModerationHold(tr.failure_message)) {
        await step.run(`${code}-moderation-${i}`, () => db().update(translations).set({ error: null, status: "processing", updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code))));
        await waitForJob(step, `${code}-wait-${i}`, "heygen", gen.translationId, cfg.pollSeconds);
        continue;
      }
      if (tr.status === "failed") {
        await step.run(`${code}-failed`, async () => {
          if (gen.entryId) await settleSpend(gen.entryId, { status: "failed", actualUsd: 0 });
        });
        return fail(`The ${lang} video could not be rendered: ${tr.failure_message ?? "unknown reason"}.`);
      }
      await waitForJob(step, `${code}-wait-${i}`, "heygen", gen.translationId, cfg.pollSeconds);
    }
    if (!finished) return fail(`The ${lang} video took longer than ${cfg.maxWaitMinutes} minutes (the translation service may still be reviewing it). Retry the step later: it picks up the same video, without paying again.`);
  } else {
    const t = await step.run(`${code}-reload`, async () => {
      const [row] = await db().select().from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, code))).limit(1);
      return { videoAssetId: row?.videoAssetId ?? "", srtAssetId: row?.srtAssetId ?? "" };
    });
    translatedAssetId = t.videoAssetId;
    srtAssetId = t.srtAssetId;
  }

  // c. Optional picture enhancement.
  let sourceForCaptions = translatedAssetId;
  if (input.enhance) {
    const enh = await step.run(`${code}-enhance-submit`, () => withDeadline("Starting the enhancement", 5, async (): Promise<{ requestId: string; entryId: string; estimate: number; stepId: string } | { error: string }> => {
      try {
        const stepRow = await loadStep(projectId, "captions");
        const asset = await loadAsset(translatedAssetId);
        const estimate = estimateEnhanceUsd(asset.seconds ?? input.sourceSeconds);
        const reserved = await reserveSpend({ service: "fal", action: "enhance_video", estimatedUsd: estimate, fingerprintInput: { projectId, code, asset: asset.id }, projectId, stepId: stepRow.id, language: code, languageCount });
        try {
          // Upscale to 1080p when the translated video is smaller (27 Oct 2026: a 720×1280 source stayed 720p and
          // was only stretched to 1080 by the caption step); the factor is read from the real size (free probe).
          const videoUrl = await providerUrl(asset);
          const probed = await withRetries("Reading the video size", () => ingestFromUrl(videoUrl)).catch(() => null);
          const short = probed?.width && probed?.height ? Math.min(probed.width, probed.height) : 0;
          const upscaleFactor = short > 0 && short < 1000 ? Math.min(2, Math.round((1080 / short) * 100) / 100) : 1;
          const job = await withRetries("Starting the enhancement", async () => submitEnhance({ videoUrl, upscaleFactor }));
          return { requestId: job.requestId, entryId: reserved.entryId, estimate, stepId: stepRow.id };
        } catch (error) {
          await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
          throw error;
        }
      } catch (error) {
        return { error: budgetMessage(error) };
      }
    }));
    if ("error" in enh) return fail(enh.error);
    await step.run(`${code}-phase-enhance`, () => setLanguagePhase(projectId, code, "enhance"));
    let enhanced = "";
    for (let i = 0; i < MAX_POLLS && !enhanced; i++) {
      const st = await step.run(`${code}-enhance-status-${i}`, () => getEnhanceStatus(enh.requestId));
      if (st.status === "COMPLETED") {
        const stored = await step.run(`${code}-enhance-store`, () => withDeadline("Saving the enhanced video", 10, async (): Promise<{ assetId: string } | { error: string }> => {
          try {
            const asset = await storeFromUrl({ projectId, stepId: enh.stepId, kind: "enhanced", url: st.videoUrl, fileName: `enhanced-${code}.mp4`, language: code, seconds: input.sourceSeconds, fallbackMime: "video/mp4" });
            await db().update(translations).set({ enhancedAssetId: asset.id, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
            await settleSpend(enh.entryId, { status: "completed", actualUsd: enh.estimate });
            return { assetId: asset.id };
          } catch (error) {
            return { error: budgetMessage(error) };
          }
        }));
        if ("error" in stored) return fail(stored.error);
        enhanced = stored.assetId;
        break;
      }
      if (st.status === "FAILED") {
        await step.run(`${code}-enhance-failed`, () => settleSpend(enh.entryId, { status: "failed", actualUsd: 0 }));
        return fail(`Enhancing the ${lang} video failed: ${st.error}`);
      }
      await step.sleep(`${code}-enhance-wait-${i}`, `${cfg.pollSeconds}s`);
    }
    if (!enhanced) return fail(`Enhancing the ${lang} video took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);
    sourceForCaptions = enhanced;
  }

  // c2. The silent start and end (28/29 Oct 2026): a tiny GIF of the silence and the nearest half second of
  // speech shows whether the picture changes there. A new picture (a product shot, a logo, an end card) is
  // kept; dead air is cut. About a cent each; any problem keeps the plain rule. END_PROBE=off switches it off.
  const probeOn = (input.trimSilence ?? false) && process.env.END_PROBE !== "off";
  const keepHead = probeOn ? await probeKeeps(step, projectId, input, code, sourceForCaptions, srtAssetId, languageCount, "start") : false;
  const keepTail = probeOn ? await probeKeeps(step, projectId, input, code, sourceForCaptions, srtAssetId, languageCount, "end") : false;

  // d. Captions and format via Shotstack.
  const render = await step.run(`${code}-captions-submit`, () => withDeadline("Starting the captions", 10, async (): Promise<{ renderId: string; entryId: string; estimate: number; stepId: string; seconds: number } | { error: string }> => {
    try {
      const stepRow = await loadStep(projectId, "captions");
      const timing = await captionTiming(projectId, input, code, sourceForCaptions, srtAssetId);
      const { video, srt, seconds, cues } = timing;
      // A new picture before the first line (a product shot, a logo) stays (29 Oct 2026); dead air is cut.
      const trimStart = keepHead ? 0 : timing.trimStart;
      // A new picture after the last line (an end card, an outro) stays (28 Oct 2026); dead air is cut.
      const trimEnd = keepTail ? 0 : timing.trimEnd;
      let srtUrl = srt ? await providerUrl(srt) : undefined;
      // With text removal the captions are always on, on a bar (29 Oct 2026): they hide the cleaned spot.
      const captionLook = input.removeText ? styleOverRemovedText(input.captionStyle) : input.captionStyle;
      if (cues.length > 0) {
        // The captions are always the checked lines (25 Oct 2026; before, only when trimming), shifted
        // with the picture when silence is cut. The service's own SRT is the fallback without lines.
        // Short chunks of a few words, at most two caption lines (27 Oct 2026): a whole sentence at once read as a block.
        const size = captionStyleOf(input.captionStyle).size;
        const boxWidth = captionBoxWidth({ coverBox: input.oldTextBox ?? undefined, size: input.format === "original" && upload.width && upload.height ? { width: upload.width, height: upload.height } : undefined, captionStyle: captionLook });
        const chunks = chunkCues(cues.map((c) => ({ index: c.index, start: Math.max(0, c.start - trimStart), end: Math.max(0, c.end - trimStart), text: c.text })), chunkCharsFor(size, boxWidth));
        // Over removed text the bar never leaves the screen, so the cleaned spot never shows.
        // The last line runs a second past the end (28 Oct 2026): the edit rounds its length up to a tenth of a
        // second, so a cue that stops exactly at the end left the final frame (the one that stays on screen) bare.
        const shifted = buildSrt(input.oldTextBox || input.removeText ? fillGaps(chunks, Math.max(1, seconds - trimStart - trimEnd) + 1) : chunks);
        const asset = await storeBytes({ projectId, stepId: stepRow.id, kind: "srt", data: new TextEncoder().encode(shifted), mime: "application/x-subrip", fileName: `captions-${code}${trimStart > 0 ? "-trimmed" : "-checked"}.srt`, language: code });
        srtUrl = await providerUrl(asset);
      }
      const edit = buildCaptionEdit({
        videoUrl: await providerUrl(video),
        seconds,
        srtUrl,
        fit: "crop",
        size: input.format === "original" && upload.width && upload.height ? { width: upload.width, height: upload.height } : undefined,
        trimStart,
        trimEnd,
        captionPosition: input.captionPosition ?? "low",
        captionStyle: captionLook,
        // Over removed text, the captions sit where that text was (only when the frame keeps the source's height).
        coverBox: input.oldTextBox ?? undefined,
      });
      // Counted as $0.10 per 30 s even in the sandbox, so budgets match production.
      const estimate = Math.round(edit.meta.totalSeconds * SHOTSTACK_USD_PER_SECOND * 1000) / 1000;
      const reserved = await reserveSpend({ service: "shotstack", action: "translate_captions", estimatedUsd: estimate, fingerprintInput: { projectId, code, video: video.id }, projectId, stepId: stepRow.id, language: code, languageCount, meta: { env: shotstackEnv() } });
      try {
        const r = await withRetries("Starting the captions", () => startRender(edit, callbackUrlFor("shotstack")));
        return { renderId: r.renderId, entryId: reserved.entryId, estimate, stepId: stepRow.id, seconds: edit.meta.totalSeconds };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return { error: budgetMessage(error) };
    }
  }));
  if ("error" in render) return fail(render.error);
  await step.run(`${code}-phase-captions`, () => setLanguagePhase(projectId, code, "captions"));

  for (let i = 0; i < MAX_POLLS; i++) {
    const r = await step.run(`${code}-captions-status-${i}`, async () => {
      const x = await getRender(render.renderId);
      return { status: x.status, url: x.url ?? null, duration: x.duration ?? null, error: x.error ?? null };
    });
    if (r.status === "done" && r.url) {
      const stored = await step.run(`${code}-captions-store`, () => withDeadline("Saving the final video", 10, async (): Promise<{ assetId: string } | { error: string }> => {
        try {
          const asset = await storeFromUrl({ projectId, stepId: render.stepId, kind: "captioned", url: r.url!, fileName: `final-${code}.mp4`, language: code, seconds: r.duration ?? render.seconds, fallbackMime: "video/mp4" });
          await db().update(translations).set({ captionedAssetId: asset.id, status: "completed", error: null, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
          await settleSpend(render.entryId, { status: "completed", actualUsd: shotstackEnv() === "v1" ? render.estimate : render.estimate });
          await setLanguagePhase(projectId, code, "done");
          return { assetId: asset.id };
        } catch (error) {
          return { error: budgetMessage(error) };
        }
      }));
      if ("error" in stored) return fail(stored.error);
      await requestQualityReport(step, projectId, code);
      return { ok: true, assetId: stored.assetId };
    }
    if (r.status === "failed") {
      await step.run(`${code}-captions-failed`, () => settleSpend(render.entryId, { status: "failed", actualUsd: 0 }));
      return fail(`Adding captions to the ${lang} video failed: ${r.error || "unknown reason"}.`);
    }
    await waitForJob(step, `${code}-captions-wait-${i}`, "shotstack", render.renderId, cfg.pollSeconds);
  }
  return fail(`Captions for ${lang} took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);
}
