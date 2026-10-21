import sharp from "sharp";
import { adProjectCreated, adScriptApproved, inngest, stepRetry } from "@/lib/inngest/client";
import { and, eq } from "drizzle-orm";
import { assets, db, type AdInput } from "@/lib/db";
import { writeScriptWithinLimit, SCRIPT_MODEL, type AdScript } from "@/lib/services/script";
import { clipPrompt } from "@/lib/clipPrompt";
import { isAdTone } from "@/lib/adOptions";
import { ACCENTS, AD_LANGUAGES, isAdLanguage, speedValue } from "@/lib/voiceOptions";
import { findVoice, listVoiceOptions } from "@/lib/voices";
import {
  analyzeProductPhoto,
  cropToNineSixteen,
  CLIP_MODELS,
  CLIP_SECONDS,
  estimateClipCost,
  EXPAND_USD_PER_IMAGE,
  expandToNineSixteen,
  getProductClipStatus,
  planNineSixteen,
  submitProductClip,
} from "@/lib/services/productClip";
import { createAvatarVideo, estimateCostUsd, estimateSeconds, getLook, getVideo, listAllLooks, type AvatarLook, type HeygenEngine } from "@/lib/services/heygen";
import { isPortraitLook, lookOrientation } from "@/lib/lookOrientation";
import { buildAdEdit, getRender, shotstackEnv, startRender } from "@/lib/services/finalEdit";
import { annotateSpend, reserveSpend, settleSpend } from "@/lib/services/costGuard";
import { SHOTSTACK_USD_PER_SECOND } from "@/lib/translatePricing";
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
  setProjectFinal,
  StepFailure,
  storeBytes,
  storeFromUrl,
  withDeadline,
  withRetries,
} from "@/lib/workflow/steps";

/**
 * Workflow A — one product → one finished 9:16 ad.
 *
 *   script (Claude) ─┬→ productClip (fal.ai) ─┐
 *                    └→ presenter (HeyGen)  ─┴→ finalEdit (Shotstack) → storage → completed
 *
 * Triggered by project/ad.created and by project/step.retry. Every step is idempotent (skips
 * when the database says it is completed), so a retry resumes where the project stopped.
 * Providers are polled with step.sleep; webhooks (step 8) will shorten the waits.
 */

const MAX_POLLS = Math.ceil((cfg.maxWaitMinutes * 60) / cfg.pollSeconds);

export const adWorkflow = inngest.createFunction(
  {
    id: "workflow-ad",
    name: "Workflow A: ad from a product photo",
    retries: 0, // our own retry policy: withRetries() per call, Retry button per step
    concurrency: 3,
    triggers: [adProjectCreated, stepRetry],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId;
    const project = await step.run("load-project", () => loadProject(projectId));
    if (project.workflow !== "ad") return { skipped: "not an ad project" };
    if (project.status === "completed") return { skipped: "already completed" };

    /* ---------- 1. script ---------- */
    const script = await step.run("script", () => withDeadline("Writing the script", 10, async () => {
      const existing = await loadStep(projectId, "script");
      if (existing.status === "completed" && existing.output?.script) return existing.output.script as AdScript;
      const row = await markProcessing(projectId, "script");
      try {
        const input = (await loadProject(projectId)).input as AdInput;
        const firstImage = input.imageAssetIds[0] ? await loadAsset(input.imageAssetIds[0]) : null;
        const image = firstImage ? await imageForClaude(await downloadAsset(firstImage)) : undefined;
        const hintParts = [input.direction?.trim(), input.script ? `The seller wrote these presenter lines; keep them as the presenter script, only trim for timing:\n${input.script}` : undefined].filter(Boolean);
        const base = {
          productName: input.productName,
          description: input.description,
          productUrl: input.productUrl,
          hint: hintParts.length ? hintParts.join("\n") : undefined,
          offer: input.offer,
          tone: input.tone && isAdTone(input.tone) ? input.tone : undefined,
          language: input.language ?? cfg.adLanguage,
          spelling: input.language && isAdLanguage(input.language) ? ACCENTS[input.language].find((a) => a.key === input.accent)?.spelling : undefined,
          targetSeconds: input.seconds ?? cfg.adSeconds,
          angle: "problem_solution" as const,
        };
        // One paid call, plus one automatic shortening pass when the presenter text is over the word limit.
        const result = await writeScriptWithinLimit({ ...base, image }, async ({ kind, estimateUsd, run }) => {
          const reserved = await reserveSpend({ service: "anthropic", action: kind === "script" ? "ad_script" : "ad_script_shorten", estimatedUsd: estimateUsd, fingerprintInput: { projectId, attempt: row.attempt, kind }, projectId, stepId: row.id, meta: { attempt: row.attempt, model: SCRIPT_MODEL, hasImage: Boolean(image) && kind === "script", pass: kind } });
          try {
            const r = await withRetries(kind === "script" ? "Writing the script" : "Shortening the script", run);
            await settleSpend(reserved.entryId, { status: "completed", actualUsd: r.costUsd, basis: "tokens", meta: { usage: r.usage } });
            return r;
          } catch (error) {
            await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
            throw error;
          }
        });
        await storeBytes({ projectId, stepId: row.id, kind: "script", data: new TextEncoder().encode(JSON.stringify(result.script, null, 2)), mime: "application/json", fileName: "script.json" });
        await markCompleted(projectId, "script", { output: { script: result.script, wordCount: result.wordCount, maxWords: result.maxWords, attempts: result.attempts, ...(result.warning ? { warning: result.warning } : {}) }, costUsd: result.costUsd });
        return result.script;
      } catch (error) {
        return failStep(projectId, "script", error);
      }
    }));

    /* ---------- 1b. "Review script first": wait for the customer before anything paid starts ---------- */
    const reviewed = await runScriptReview(projectId, script, step);

    /* ---------- 2 + 3. product clip and presenter, in parallel ---------- */
    const [clipAssetId, presenterAssetId] = await Promise.all([runProductClip(projectId, reviewed, step), runPresenter(projectId, reviewed, step)]);

    /* ---------- 4. final edit ---------- */
    const final = await runFinalEdit(projectId, reviewed, clipAssetId, presenterAssetId, step);
    return { projectId, finalAssetId: final };
  },
);

type StepTools = Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"];

/* ---------- script review (optional pause) ---------- */

/**
 * With reviewScript the script step goes to "needs_input" and the run waits (up to 7 days) for
 * project/ad-script.approved, sent by approveScript() once the customer picked a hook and maybe
 * edited the text. The approved script is read back from the step row, so a retry of a later step
 * (which re-enters this function) skips the wait and uses the same approved text.
 */
async function runScriptReview(projectId: string, script: AdScript, step: StepTools): Promise<AdScript> {
  const state = await step.run("script-review-check", async () => {
    const project = await loadProject(projectId);
    const row = await loadStep(projectId, "script");
    const approved = typeof row.output?.approvedAt === "string";
    return { wanted: Boolean((project.input as AdInput).reviewScript), approved, script: (row.output?.script as AdScript | undefined) ?? null };
  });
  if (!state.wanted || state.approved) return state.script ?? script;

  await step.run("script-review-wait", () => markWaitingForUser(projectId, "script"));
  const event = await step.waitForEvent("script-review-approval", { event: adScriptApproved, timeout: "7d", if: `async.data.projectId == "${projectId}"` });
  if (!event) {
    await step.run("script-review-timeout", () => failStep(projectId, "script", new StepFailure("The script was not approved within 7 days. Retry to continue with the generated script.")));
  }
  return step.run("script-review-load", async () => (await loadStep(projectId, "script")).output?.script as AdScript);
}

/** Downscale the first product photo for Claude (≤ ~1 MP keeps the token cost small). */
async function imageForClaude(bytes: Uint8Array) {
  const buf = await sharp(Buffer.from(bytes)).rotate().resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({ quality: 82 }).toBuffer();
  return { base64: buf.toString("base64"), mediaType: "image/jpeg" as const };
}

/* ---------- product clip ---------- */

async function runProductClip(projectId: string, script: AdScript, step: StepTools): Promise<string> {
  const key = "productClip";
  const existing = await step.run("clip-check", () => loadStep(projectId, key));
  if (existing.status === "completed" && typeof existing.output?.assetId === "string") return existing.output.assetId;

  // a. Prepare the 9:16 image (crop when the product fits, otherwise paid AI expansion) and submit the clip.
  const job = await step.run("clip-submit", () => withDeadline("Preparing the product clip", 10, async () => {
    const row = await markProcessing(projectId, key);
    try {
      const input = (await loadProject(projectId)).input as AdInput;
      const photo = await loadAsset(input.imageAssetIds[0]);
      const original = Buffer.from(await downloadAsset(photo));
      const analysis = await analyzeProductPhoto(original);
      const plan = planNineSixteen(analysis);
      let prepared: Buffer;
      let expandCost = 0;
      if (plan.fits) {
        prepared = await cropToNineSixteen(original, plan.crop);
      } else {
        const reserved = await reserveSpend({ service: "fal", action: "expand_image", estimatedUsd: EXPAND_USD_PER_IMAGE, fingerprintInput: { projectId, photo: photo.id, attempt: row.attempt }, projectId, stepId: row.id, meta: { attempt: row.attempt, model: "Bria Expand" } });
        try {
          const expanded = await withRetries("Expanding the photo to 9:16", () => expandToNineSixteen(original, analysis));
          prepared = expanded.buffer;
          expandCost = expanded.costUsd;
          await settleSpend(reserved.entryId, { status: "completed", actualUsd: expanded.costUsd });
        } catch (error) {
          await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
          throw error;
        }
      }
      await storeBytes({ projectId, stepId: row.id, kind: "image", data: new Uint8Array(prepared), mime: "image/jpeg", fileName: "prepared-9x16.jpg" });

      const model = cfg.clipModel;
      const prompt = clipPrompt({ productName: input.productName, mood: script.mood, hasPerson: script.photoShowsPerson });
      const estimate = estimateClipCost(model, CLIP_SECONDS);
      const reserved = await reserveSpend({ service: "fal", action: `clip_${model}`, estimatedUsd: estimate, fingerprintInput: { projectId, attempt: row.attempt }, projectId, stepId: row.id, meta: { attempt: row.attempt, model: CLIP_MODELS[model].label, endpointId: CLIP_MODELS[model].endpointId, seconds: CLIP_SECONDS } });
      try {
        const submitted = await withRetries("Starting the product clip", () => submitProductClip({ image: prepared, model, prompt, durationSeconds: CLIP_SECONDS }));
        await annotateSpend(reserved.entryId, { requestId: submitted.requestId }).catch(() => {});
        return { ...submitted, entryId: reserved.entryId, estimate, expandCost, stepId: row.id };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return failStep(projectId, key, error);
    }
  }));

  // b. Poll until the clip is ready.
  for (let i = 0; i < MAX_POLLS; i++) {
    const status = await step.run(`clip-status-${i}`, () => getProductClipStatus(job.endpointId, job.requestId));
    if (status.status === "COMPLETED") {
      return step.run("clip-store", () => withDeadline("Saving the product clip", 10, async () => {
        try {
          const asset = await storeFromUrl({ projectId, stepId: job.stepId, kind: "product_clip", url: status.videoUrl, fileName: "product-clip.mp4", seconds: CLIP_SECONDS, fallbackMime: "video/mp4" });
          await settleSpend(job.entryId, { status: "completed", actualUsd: job.estimate });
          await markCompleted(projectId, key, { output: { assetId: asset.id, model: CLIP_MODELS[cfg.clipModel].label }, externalJobId: job.requestId, costUsd: job.estimate + job.expandCost });
          return asset.id;
        } catch (error) {
          return failStep(projectId, key, error);
        }
      }));
    }
    if (status.status === "FAILED") {
      await step.run("clip-failed", async () => {
        await settleSpend(job.entryId, { status: "failed", actualUsd: 0 });
        return failStep(projectId, key, new StepFailure(`The product clip could not be generated: ${status.error}`));
      });
    }
    await step.sleep(`clip-wait-${i}`, `${cfg.pollSeconds}s`);
  }
  return step.run("clip-timeout", () => failStep(projectId, key, new StepFailure(`The product clip took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`)));
}

/* ---------- presenter ---------- */

async function runPresenter(projectId: string, script: AdScript, step: StepTools): Promise<string> {
  const key = "presenter";
  const existing = await step.run("presenter-check", () => loadStep(projectId, key));
  if (existing.status === "completed" && typeof existing.output?.assetId === "string") return existing.output.assetId;

  const job = await step.run("presenter-submit", () => withDeadline("Starting the presenter video", 5, async () => {
    const row = await markProcessing(projectId, key);
    try {
      const adInput = (await loadProject(projectId)).input as AdInput;
      const engine = adInput.engine ?? cfg.heygenEngine;
      const { lookId, voiceId } = await pickPresenter(engine, adInput.lookId, adInput);
      const seconds = estimateSeconds(script.presenterScript);
      const estimate = estimateCostUsd(engine, seconds);
      const reserved = await reserveSpend({ service: "heygen", action: "avatar_video", estimatedUsd: estimate, fingerprintInput: { projectId, attempt: row.attempt }, projectId, stepId: row.id, meta: { attempt: row.attempt, engine, resolution: cfg.heygenResolution, seconds } });
      try {
        // Customer background (colour or own image). HeyGen needs remove_background, which only works on
        // looks trained with matting; a look without it answers 400, and then we keep the look's own background.
        const background = await presenterBackground(adInput);
        const speed = speedValue(adInput.speed);
        const base = { avatarId: lookId, voiceId, script: script.presenterScript, engine, resolution: cfg.heygenResolution, fit: "cover" as const, voiceSettings: speed !== 1 ? { speed } : undefined, title: `Reelay ${projectId.slice(0, 8)}`, idempotencyKey: reserved.fingerprint };
        let backgroundWarning: string | undefined;
        let created;
        try {
          created = await withRetries("Starting the presenter video", () => createAvatarVideo(background ? { ...base, background, removeBackground: true } : base));
        } catch (error) {
          if (!background || !isBackgroundRejection(error)) throw error;
          backgroundWarning = "This presenter's own background cannot be replaced, so the chosen background was not applied.";
          created = await withRetries("Starting the presenter video", () => createAvatarVideo({ ...base, idempotencyKey: `${reserved.fingerprint}-nobg` }));
        }
        return { videoId: created.video_id, entryId: reserved.entryId, estimate, stepId: row.id, engine, backgroundWarning };
      } catch (error) {
        await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return failStep(projectId, key, error);
    }
  }));

  for (let i = 0; i < MAX_POLLS; i++) {
    const video = await step.run(`presenter-status-${i}`, () => getVideo(job.videoId));
    if (video.status === "completed" && video.video_url) {
      return step.run("presenter-store", () => withDeadline("Saving the presenter video", 10, async () => {
        try {
          const asset = await storeFromUrl({ projectId, stepId: job.stepId, kind: "presenter", url: video.video_url!, fileName: "presenter.mp4", seconds: video.duration ?? undefined, fallbackMime: "video/mp4" });
          await settleSpend(job.entryId, { status: "completed", actualUsd: video.duration ? estimateCostUsd(job.engine, video.duration) : job.estimate, basis: "list", meta: { durationSeconds: video.duration ?? null, videoId: job.videoId } });
          await markCompleted(projectId, key, { output: { assetId: asset.id, seconds: video.duration ?? null, ...(job.backgroundWarning ? { warning: job.backgroundWarning } : {}) }, externalJobId: job.videoId, costUsd: job.estimate });
          return asset.id;
        } catch (error) {
          return failStep(projectId, key, error);
        }
      }));
    }
    if (video.status === "failed") {
      await step.run("presenter-failed", async () => {
        await settleSpend(job.entryId, { status: "failed", actualUsd: 0 });
        return failStep(projectId, key, new StepFailure(`The presenter video could not be generated: ${video.failure_message ?? video.failure_code ?? "unknown reason"}.`));
      });
    }
    await step.sleep(`presenter-wait-${i}`, `${cfg.pollSeconds}s`);
  }
  return step.run("presenter-timeout", () => failStep(projectId, key, new StepFailure(`The presenter video took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`)));
}

/** The customer's presenter background as HeyGen expects it: a hex colour, or a 6-hour signed URL of the uploaded image. */
async function presenterBackground(input: AdInput): Promise<{ type: "color"; value: string } | { type: "image"; url: string } | undefined> {
  if (!input.background) return undefined;
  if (input.background.type === "color") return { type: "color", value: input.background.value };
  const asset = await loadAsset(input.background.assetId);
  return { type: "image", url: await providerUrl(asset) };
}

/** HeyGen refuses remove_background on a look without matting with a 400 that names the background. */
function isBackgroundRejection(error: unknown) {
  const e = error as { status?: number; code?: string; message?: string };
  return e?.status === 400 && /background|matting/i.test(`${e.code ?? ""} ${e.message ?? ""}`);
}

/**
 * Configured look/voice, or the first public portrait look that supports the engine (free listing calls).
 * A landscape look is refused: HeyGen letterboxes it in 9:16 (picture 720×406 in a 720×1280 frame) and
 * a centre crop would be a blurry strip, so the ad would be unusable.
 */
async function pickPresenter(engine: HeygenEngine, chosenLookId: string | undefined, input: AdInput) {
  let look: AvatarLook | undefined;
  // The customer's pick wins; otherwise the configured default look.
  const wanted = chosenLookId || cfg.heygenLookId;
  if (wanted) {
    look = await withRetries("Checking the presenter", () => getLook(wanted));
    if (!look) throw new StepFailure(chosenLookId ? "The chosen presenter is no longer available. Pick another presenter and retry." : "The configured presenter (HEYGEN_DEFAULT_LOOK_ID) was not found.");
    if (!isPortraitLook(look)) {
      throw new StepFailure(
        `The configured presenter "${look.name}" is a ${lookOrientation(look)} look. The ad is vertical (9:16) and a ${lookOrientation(look)} presenter would come back with grey bars above and below. Choose a portrait look (HEYGEN_DEFAULT_LOOK_ID in .env.local; /dev/heygen marks portrait looks).`,
      );
    }
    if (look.supported_api_engines && !look.supported_api_engines.includes(engine)) {
      throw new StepFailure(`The configured presenter "${look.name}" does not support the chosen quality (${engine === "avatar_iv" ? "Premium" : "Standard"}). Pick another presenter or quality.`);
    }
  } else {
    // No default configured: first public portrait studio look (then digital twin) that supports the engine.
    const fits = (l: AvatarLook) => isPortraitLook(l) && (!l.supported_api_engines || l.supported_api_engines.includes(engine));
    look = (await withRetries("Listing presenters", () => listAllLooks("studio_avatar"))).find(fits) ?? (await withRetries("Listing presenters", () => listAllLooks("digital_twin"))).find(fits);
    if (!look) throw new StepFailure("No portrait presenter supports the chosen quality. Set HEYGEN_DEFAULT_LOOK_ID in .env.local to a portrait look.");
  }
  return { lookId: look.id, voiceId: await pickVoice(look, input) };
}

/**
 * The voice for the run, checked before anything is paid: the customer's pick when it exists and
 * speaks the chosen language; otherwise the look's own voice when that fits the language; otherwise
 * the first public voice of the language (and its accent, when chosen). A plain message, never a crash.
 */
async function pickVoice(look: AvatarLook, input: AdInput): Promise<string> {
  const language = isAdLanguage(input.language) ? input.language : isAdLanguage(cfg.adLanguage) ? cfg.adLanguage : "en";
  const label = AD_LANGUAGES[language].label;
  if (input.voiceId) {
    const found = await withRetries("Checking the voice", () => findVoice(input.voiceId!));
    if (!found) throw new StepFailure("The chosen voice is no longer available. Pick another voice and retry.");
    if (found.language !== language) throw new StepFailure(`The chosen voice does not speak ${label}. Pick a ${label} voice and retry.`);
    return found.voice.voice_id;
  }
  const candidates = [cfg.heygenVoiceId, look.default_voice_id].filter((v): v is string => Boolean(v));
  for (const id of candidates) {
    const found = await withRetries("Checking the voice", () => findVoice(id));
    if (found?.language === language) return found.voice.voice_id;
  }
  const options = await withRetries("Listing voices", () => listVoiceOptions({ language, accent: input.accent, gender: (look.gender ?? "").toLowerCase() === "male" ? "male" : "female", limit: 5 }));
  const first = options.voices[0];
  if (!first) throw new StepFailure(`No voice speaks ${label}${input.accent ? ` with the chosen accent` : ""}. Choose another language or accent and retry.`);
  return first.id;
}

/* ---------- final edit ---------- */

async function runFinalEdit(projectId: string, script: AdScript, clipAssetId: string, presenterAssetId: string, step: StepTools): Promise<string> {
  const key = "finalEdit";
  const existing = await step.run("final-check", () => loadStep(projectId, key));
  if (existing.status === "completed" && typeof existing.output?.assetId === "string") return existing.output.assetId;

  const job = await step.run("final-submit", () => withDeadline("Starting the final edit", 5, async () => {
    const row = await markProcessing(projectId, key);
    try {
      const [clip, presenter] = await Promise.all([loadAsset(clipAssetId), loadAsset(presenterAssetId)]);
      const adInput = (await loadProject(projectId)).input as AdInput;
      const logoAsset = adInput.brand?.logoAssetId ? await loadAsset(adInput.brand.logoAssetId) : null;
      // The 9:16 photo the clip step prepared (stored as "prepared-9x16.jpg"); used for the still overlays.
      const preparedPhoto = (await db().select().from(assets).where(and(eq(assets.projectId, projectId), eq(assets.kind, "image"))))
        .filter((a) => a.storagePath.endsWith("prepared-9x16.jpg"))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const edit = buildAdEdit({
        presenterUrl: await providerUrl(presenter),
        presenterSeconds: presenter.seconds ?? adInput.seconds ?? cfg.adSeconds,
        productClipUrl: await providerUrl(clip),
        productClipSeconds: clip.seconds ?? CLIP_SECONDS,
        productPhotoUrl: preparedPhoto ? await providerUrl(preparedPhoto) : undefined,
        colors: adInput.brand?.accent ? { accent: adInput.brand.accent } : undefined,
        brand: { font: adInput.brand?.font, captionStyle: adInput.brand?.captionStyle, logoUrl: logoAsset ? await providerUrl(logoAsset) : undefined },
        captionLanguage: adInput.language ?? cfg.adLanguage,
      });
      const env = shotstackEnv();
      const estimate = env === "v1" ? Math.round(edit.meta.totalSeconds * SHOTSTACK_USD_PER_SECOND * 1000) / 1000 : 0;
      const reserved = env === "v1" ? await reserveSpend({ service: "shotstack", action: "ad_render", estimatedUsd: estimate, fingerprintInput: { projectId, attempt: row.attempt }, projectId, stepId: row.id, meta: { attempt: row.attempt, env, seconds: edit.meta.totalSeconds } }) : null;
      try {
        const render = await withRetries("Starting the final edit", () => startRender(edit));
        return { renderId: render.renderId, entryId: reserved?.entryId ?? "", estimate, totalSeconds: edit.meta.totalSeconds, stepId: row.id };
      } catch (error) {
        if (reserved) await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
        throw error;
      }
    } catch (error) {
      return failStep(projectId, key, error);
    }
  }));

  for (let i = 0; i < MAX_POLLS; i++) {
    const render = await step.run(`final-status-${i}`, () => getRender(job.renderId));
    if (render.status === "done" && render.url) {
      return step.run("final-store", () => withDeadline("Saving the final video", 10, async () => {
        try {
          const asset = await storeFromUrl({ projectId, stepId: job.stepId, kind: "final", url: render.url!, fileName: "ad-9x16.mp4", seconds: render.duration ?? job.totalSeconds, width: 1080, height: 1920, fallbackMime: "video/mp4" });
          if (job.entryId) await settleSpend(job.entryId, { status: "completed", actualUsd: job.estimate });
          await markCompleted(projectId, key, { output: { assetId: asset.id }, externalJobId: job.renderId, costUsd: job.estimate });
          await setProjectFinal(projectId, asset.id);
          return asset.id;
        } catch (error) {
          return failStep(projectId, key, error);
        }
      }));
    }
    if (render.status === "failed") {
      await step.run("final-failed", async () => {
        if (job.entryId) await settleSpend(job.entryId, { status: "failed", actualUsd: 0 });
        return failStep(projectId, key, new StepFailure(`The final edit failed: ${render.error || "unknown reason"}.`));
      });
    }
    await step.sleep(`final-wait-${i}`, `${cfg.pollSeconds}s`);
  }
  return step.run("final-timeout", () => failStep(projectId, key, new StepFailure(`The final edit took longer than ${cfg.maxWaitMinutes} minutes. Retry the step.`)));
}

