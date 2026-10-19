import { and, eq } from "drizzle-orm";
import { inngest, reviewApproved, stepRetry, translateProjectCreated } from "@/lib/inngest/client";
import { db, projects, translations, type TranslateInput, type TranslationRow } from "@/lib/db";
import { LANGUAGES, languageOf } from "@/lib/languages";
import type { LanguageCode, Segment } from "@/lib/types";
import { maxCharsForSegment, SHOTSTACK_USD_PER_SECOND } from "@/lib/translatePricing";
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
  type SrtCue,
} from "@/lib/services/translate";
import { rewriteSegmentsInAdTone } from "@/lib/services/adTone";
import { estimateEnhanceUsd, getEnhanceStatus, submitEnhance } from "@/lib/services/enhance";
import { buildCaptionEdit, getRender, ingestFromUrl, shotstackEnv, startRender } from "@/lib/services/finalEdit";
import { reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { workflowSettings as cfg } from "@/lib/workflow/settings";
import {
  downloadAsset,
  failStep,
  loadAsset,
  loadProject,
  loadStep,
  markCompleted,
  markProcessing,
  markWaitingForUser,
  providerUrl,
  StepFailure,
  storeFromUrl,
  withRetries,
} from "@/lib/workflow/steps";

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
    concurrency: 3,
    triggers: [translateProjectCreated, stepRetry],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId;
    const project = await step.run("load-project", () => loadProject(projectId));
    if (project.workflow !== "translate") return { skipped: "not a translate project" };
    if (project.status === "completed") return { skipped: "already completed" };
    const input = project.input as TranslateInput;

    /* ---------- 1. upload ---------- */
    const upload = await step.run("upload", async () => {
      const existing = await loadStep(projectId, "upload");
      if (existing.status === "completed" && typeof existing.output?.heygenAssetId === "string") return existing.output as UploadOutput;
      const row = await markProcessing(projectId, "upload");
      try {
        const source = await loadAsset(input.sourceAssetId);
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
        return failStep(projectId, "upload", error);
      }
    });

    /* ---------- 2. translate (proofread sessions) ---------- */
    const sessions = await runTranslate(projectId, input, upload, step);

    /* ---------- 3. review ---------- */
    await runReview(projectId, input, step);

    /* ---------- 4. render + enhance + captions, per language ---------- */
    const results = await runCaptions(projectId, input, upload, sessions, step);
    await step.run("complete", async () => {
      await db().update(projects).set({ status: "completed", updatedAt: new Date() }).where(eq(projects.id, projectId));
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

  const started = await step.run("translate-submit", async () => {
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
          createProofread({ video: { assetId: upload.heygenAssetId }, outputLanguages: outputs.map((o) => o.heygen), mode: input.quality, title: `Reelay ${projectId.slice(0, 8)}`, idempotencyKey: `${projectId}:proofread:${row.attempt}` }),
        );
        const sessions: SessionMap = {};
        outputs.forEach((o, i) => {
          sessions[o.code] = created.proofread_ids[i];
        });
        if (Object.values(sessions).some((id) => !id)) throw new StepFailure("The translation service returned fewer sessions than languages.");
        for (const code of input.targetLanguages) {
          if (sessions[code]) await db().update(translations).set({ proofreadId: sessions[code], status: "processing", updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
        }
        return { sessions, entryIds, estimate: perLanguage * outputs.length, perLanguage, stepId: row.id };
      } catch (error) {
        for (const id of entryIds) await settleSpend(id, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return failStep(projectId, key, error);
    }
  });

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
      await step.run("translate-store", async () => {
        try {
          const cuesBy: Record<string, SrtCue[]> = {};
          for (const [code, id] of Object.entries(sessionMap)) {
            const srt = await withRetries("Downloading the subtitles", () => downloadProofreadSrt(id));
            cuesBy[code] = parseSrt(await fetchSrtText(srt.srt_url));
          }
          const transcript = cuesBy.transcript ?? [];
          const detected = statuses.find((s) => s.input_language)?.input_language ?? null;
          const detectedCode = detected ? (LANGUAGES.find((l) => l.code === detected.toLowerCase() || l.heygenName.toLowerCase() === detected.toLowerCase())?.code ?? null) : null;
          for (const code of input.targetLanguages) {
            const cues = cuesBy[code];
            if (!cues) continue;
            const originals = alignOriginalText(cues, transcript);
            const segments: Segment[] = cues.map((c, i) => ({ index: c.index, start: c.start, end: c.end, original: originals[i] ?? "", translated: c.text, text: c.text }));
            await db().update(translations).set({ segments, status: "waiting", updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
          }
          await db().update(projects).set({ detectedLanguage: detectedCode ?? (input.sourceLanguage !== "auto" ? input.sourceLanguage : null), updatedAt: new Date() }).where(eq(projects.id, projectId));
          for (const id of started.entryIds) await settleSpend(id, { status: "completed", actualUsd: started.perLanguage });
          await markCompleted(projectId, key, { output: { sessions: sessionMap }, costUsd: started.estimate });
        } catch (error) {
          return failStep(projectId, key, error);
        }
      });
      return sessionMap;
    }
    await step.sleep(`translate-wait-${i}`, `${cfg.pollSeconds}s`);
  }
  return step.run("translate-timeout", () => failStep(projectId, key, new StepFailure(`The translation took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`)));
}

/* ---------- review ---------- */

async function runReview(projectId: string, input: TranslateInput, step: StepTools) {
  const key = "review";
  const existing = await step.run("review-check", () => loadStep(projectId, key));
  if (existing.status === "completed") return;

  if (input.reviewBeforeRender) {
    await step.run("review-wait-user", () => markWaitingForUser(projectId, key));
    // approveReview() in src/lib/data/server.ts marks the step completed and sends this event.
    const approved = await step.waitForEvent("review-approval", { event: reviewApproved, timeout: "7d", if: `async.data.projectId == "${projectId}"` });
    if (!approved) {
      await step.run("review-timeout", () => failStep(projectId, key, new StepFailure("The review was not completed within 7 days. Retry to continue with the current text.")));
    }
    return;
  }

  // No review: Claude rewrites every language in ad tone, within the per-fragment limit.
  await step.run("review-auto", async () => {
    const row = await markProcessing(projectId, key);
    try {
      const rows = await db().select().from(translations).where(eq(translations.projectId, projectId));
      let total = 0;
      for (const t of rows) {
        const rewritten = await rewriteWithinLimits(projectId, row.id, t, rows.length);
        total += rewritten.costUsd;
        await db().update(translations).set({ segments: rewritten.segments, updatedAt: new Date() }).where(eq(translations.id, t.id));
      }
      await markCompleted(projectId, key, { output: { mode: "auto" }, costUsd: total });
    } catch (error) {
      return failStep(projectId, key, error);
    }
  });
}

/** One Claude pass; fragments still over the limit get a second, stricter pass; then the literal translation stays. */
async function rewriteWithinLimits(projectId: string, stepId: string, t: TranslationRow, languageCount: number) {
  const language = t.language as LanguageCode;
  let segments = t.segments;
  let costUsd = 0;
  if (segments.length === 0) return { segments, costUsd };
  for (let pass = 0; pass < 2; pass++) {
    const targets = pass === 0 ? segments : segments.filter((s) => s.text.length > maxCharsForSegment(s.start, s.end));
    if (targets.length === 0) break;
    const reserved = await reserveSpend({ service: "anthropic", action: "translate_rewrite", estimatedUsd: 0.02, fingerprintInput: { projectId, language, pass, text: targets.map((s) => s.text) }, projectId, stepId, language, languageCount });
    try {
      const result = await withRetries("Rewriting in ad tone", () => rewriteSegmentsInAdTone({ segments: targets.map((s) => ({ index: s.index, start: s.start, end: s.end, original: s.original, text: s.text })), language }));
      await settleSpend(reserved.entryId, { status: "completed", actualUsd: result.costUsd });
      costUsd += result.costUsd;
      const byIndex = new Map(result.segments.map((s) => [s.index, s.text]));
      segments = segments.map((s) => (byIndex.has(s.index) ? { ...s, text: byIndex.get(s.index)! } : s));
    } catch (error) {
      await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
      throw error;
    }
  }
  // Anything still too long keeps the literal translation (always within timing).
  segments = segments.map((s) => (s.text.length > maxCharsForSegment(s.start, s.end) ? { ...s, text: s.translated } : s));
  return { segments, costUsd };
}

/* ---------- render + enhance + captions, per language ---------- */

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

  for (const code of input.targetLanguages) {
    const proofreadId = sessions[code];
    if (!proofreadId) continue;
    const outcome = await processLanguage(projectId, input, upload, code, proofreadId, languageCount, step);
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

/** Every step of one language version. A LanguageFailure (incl. its budget) ends only this language. */
async function processLanguage(projectId: string, input: TranslateInput, upload: UploadOutput, code: LanguageCode, proofreadId: string, languageCount: number, step: StepTools): Promise<LanguageOutcome> {
  const lang = languageOf(code).tag;
  const fail = (message: string): LanguageOutcome => ({ ok: false, error: message });
  const budgetMessage = (error: unknown) => {
    const e = error as { code?: string; message?: string };
    if (e?.code === "creative_budget" || e?.code === "per_action_limit") return `Stopped: ${e.message}`;
    return error instanceof Error ? error.message : "Unknown error.";
  };

  // a. Approved subtitles back to HeyGen and the paid render.
  const gen = await step.run(`${code}-generate`, async (): Promise<{ translationId: string; entryId: string; estimate: number; done: boolean } | { error: string }> => {
    try {
      const [t] = await db().select().from(translations).where(and(eq(translations.projectId, projectId), eq(translations.language, code))).limit(1);
      if (!t) throw new LanguageFailure(`No translation row for ${lang}.`);
      if (t.translationId && t.captionedAssetId) return { translationId: t.translationId, entryId: "", estimate: 0, done: true };
      const stepRow = await loadStep(projectId, "captions");
      if (!t.translationId) {
        const srt = buildSrt(t.segments.map((s) => ({ index: s.index, start: s.start, end: s.end, text: s.text })));
        try {
          const srtAsset = await withRetries("Uploading the subtitles", () => uploadHeygenAsset({ file: new Blob([srt], { type: "application/x-subrip" }), filename: `${projectId.slice(0, 8)}-${code}.srt` }));
          await withRetries("Saving the subtitles", () => uploadProofreadSrt(proofreadId, { assetId: srtAsset.asset_id }));
        } catch (error) {
          if (isPlanRestriction(error)) throw new LanguageFailure("The translation service refused the edited subtitles for this account (editing before the render seems to need a higher plan).");
          throw error;
        }
      }
      const estimate = estimateGenerateUsd(input.sourceSeconds, input.quality);
      const reserved = await reserveSpend({ service: "heygen", action: "translate_generate", estimatedUsd: estimate, fingerprintInput: { projectId, code, attempt: stepRow.attempt }, projectId, stepId: stepRow.id, language: code, languageCount, meta: { language: code, mode: input.quality } });
      try {
        const created = await withRetries("Starting the translated video", () => generateFromProofread(proofreadId, { idempotencyKey: reserved.fingerprint }));
        await db().update(translations).set({ translationId: created.video_translation_id, status: "processing", error: null, updatedAt: new Date() }).where(eq(translations.id, t.id));
        return { translationId: created.video_translation_id, entryId: reserved.entryId, estimate, done: false };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return { error: budgetMessage(error) };
    }
  });
  if ("error" in gen) return fail(gen.error);

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
        const stored = await step.run(`${code}-store`, async (): Promise<{ videoAssetId: string; srtAssetId: string } | { error: string }> => {
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
        });
        if ("error" in stored) return fail(stored.error);
        translatedAssetId = stored.videoAssetId;
        srtAssetId = stored.srtAssetId;
        finished = true;
        break;
      }
      if (tr.status === "failed") {
        await step.run(`${code}-failed`, async () => {
          if (gen.entryId) await settleSpend(gen.entryId, { status: "failed", actualUsd: 0 });
        });
        return fail(`The ${lang} video could not be rendered: ${tr.failure_message ?? "unknown reason"}.`);
      }
      await step.sleep(`${code}-wait-${i}`, `${cfg.pollSeconds}s`);
    }
    if (!finished) return fail(`The ${lang} video took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);
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
    const enh = await step.run(`${code}-enhance-submit`, async (): Promise<{ requestId: string; entryId: string; estimate: number; stepId: string } | { error: string }> => {
      try {
        const stepRow = await loadStep(projectId, "captions");
        const asset = await loadAsset(translatedAssetId);
        const estimate = estimateEnhanceUsd(asset.seconds ?? input.sourceSeconds);
        const reserved = await reserveSpend({ service: "fal", action: "enhance_video", estimatedUsd: estimate, fingerprintInput: { projectId, code, asset: asset.id }, projectId, stepId: stepRow.id, language: code, languageCount });
        try {
          const job = await withRetries("Starting the enhancement", async () => submitEnhance({ videoUrl: await providerUrl(asset) }));
          return { requestId: job.requestId, entryId: reserved.entryId, estimate, stepId: stepRow.id };
        } catch (error) {
          await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
          throw error;
        }
      } catch (error) {
        return { error: budgetMessage(error) };
      }
    });
    if ("error" in enh) return fail(enh.error);
    let enhanced = "";
    for (let i = 0; i < MAX_POLLS && !enhanced; i++) {
      const st = await step.run(`${code}-enhance-status-${i}`, () => getEnhanceStatus(enh.requestId));
      if (st.status === "COMPLETED") {
        const stored = await step.run(`${code}-enhance-store`, async (): Promise<{ assetId: string } | { error: string }> => {
          try {
            const asset = await storeFromUrl({ projectId, stepId: enh.stepId, kind: "enhanced", url: st.videoUrl, fileName: `enhanced-${code}.mp4`, language: code, seconds: input.sourceSeconds, fallbackMime: "video/mp4" });
            await db().update(translations).set({ enhancedAssetId: asset.id, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
            await settleSpend(enh.entryId, { status: "completed", actualUsd: enh.estimate });
            return { assetId: asset.id };
          } catch (error) {
            return { error: budgetMessage(error) };
          }
        });
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

  // d. Captions and format via Shotstack.
  const render = await step.run(`${code}-captions-submit`, async (): Promise<{ renderId: string; entryId: string; estimate: number; stepId: string; seconds: number } | { error: string }> => {
    try {
      const stepRow = await loadStep(projectId, "captions");
      const video = await loadAsset(sourceForCaptions);
      const srt = srtAssetId ? await loadAsset(srtAssetId) : null;
      const edit = buildCaptionEdit({
        videoUrl: await providerUrl(video),
        seconds: video.seconds ?? input.sourceSeconds,
        srtUrl: srt ? await providerUrl(srt) : undefined,
        fit: "crop",
        size: input.format === "original" && upload.width && upload.height ? { width: upload.width, height: upload.height } : undefined,
      });
      // Counted as $0.10 per 30 s even in the sandbox, so budgets match production.
      const estimate = Math.round(edit.meta.totalSeconds * SHOTSTACK_USD_PER_SECOND * 1000) / 1000;
      const reserved = await reserveSpend({ service: "shotstack", action: "translate_captions", estimatedUsd: estimate, fingerprintInput: { projectId, code, video: video.id }, projectId, stepId: stepRow.id, language: code, languageCount, meta: { env: shotstackEnv() } });
      try {
        const r = await withRetries("Starting the captions", () => startRender(edit));
        return { renderId: r.renderId, entryId: reserved.entryId, estimate, stepId: stepRow.id, seconds: edit.meta.totalSeconds };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return { error: budgetMessage(error) };
    }
  });
  if ("error" in render) return fail(render.error);

  for (let i = 0; i < MAX_POLLS; i++) {
    const r = await step.run(`${code}-captions-status-${i}`, async () => {
      const x = await getRender(render.renderId);
      return { status: x.status, url: x.url ?? null, duration: x.duration ?? null, error: x.error ?? null };
    });
    if (r.status === "done" && r.url) {
      const stored = await step.run(`${code}-captions-store`, async (): Promise<{ assetId: string } | { error: string }> => {
        try {
          const asset = await storeFromUrl({ projectId, stepId: render.stepId, kind: "captioned", url: r.url!, fileName: `final-${code}.mp4`, language: code, seconds: r.duration ?? render.seconds, fallbackMime: "video/mp4" });
          await db().update(translations).set({ captionedAssetId: asset.id, status: "completed", error: null, updatedAt: new Date() }).where(and(eq(translations.projectId, projectId), eq(translations.language, code)));
          await settleSpend(render.entryId, { status: "completed", actualUsd: shotstackEnv() === "v1" ? render.estimate : render.estimate });
          return { assetId: asset.id };
        } catch (error) {
          return { error: budgetMessage(error) };
        }
      });
      if ("error" in stored) return fail(stored.error);
      return { ok: true, assetId: stored.assetId };
    }
    if (r.status === "failed") {
      await step.run(`${code}-captions-failed`, () => settleSpend(render.entryId, { status: "failed", actualUsd: 0 }));
      return fail(`Adding captions to the ${lang} video failed: ${r.error || "unknown reason"}.`);
    }
    await step.sleep(`${code}-captions-wait-${i}`, `${cfg.pollSeconds}s`);
  }
  return fail(`Captions for ${lang} took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`);
}
