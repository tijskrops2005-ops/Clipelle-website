import { eq } from "drizzle-orm";
import { inngest, mediaToolRequested } from "@/lib/inngest/client";
import { db, enhanceJobs } from "@/lib/db";
import { copyFromUrl, downloadObject, putObject, signedDownloadUrl } from "@/lib/storage";
import { buildCaptionEdit, buildReframeEdit, buildRemuxEdit, captionChunkPlan, getRender, ingestFromUrl, startRender } from "@/lib/services/finalEdit";
import { downloadTextRemovalOutput, getTextRemoval, startTextRemoval, textRemovalConfigured, TEXT_REMOVAL_USD_PER_GPU_SECOND } from "@/lib/services/textRemoval";
import { transcribeSegments } from "@/lib/services/qualityReview";
import { getBackgroundRemovalStatus, submitBackgroundRemoval } from "@/lib/services/enhance";
import { buildSrt } from "@/lib/services/translate";
import { chunkCues } from "@/lib/captionChunks";
import { CAPTION_PRESETS } from "@/lib/editRecipe";
import { reserveSpend, settleSpend, CostGuardError, type CostService } from "@/lib/services/costGuard";
import { CreditError } from "@/lib/credits";
import { callbackUrlFor } from "@/lib/webhooks/incoming";
import { pollDelaySeconds, waitForJob, withDeadline, withRetries } from "@/lib/workflow/steps";
import { workflowSettings as cfg } from "@/lib/workflow/settings";
import { refundEnhanceCredits, reserveEnhanceCredits, type EnhanceJobRow } from "@/lib/data/enhance";
import { imageSize } from "@/lib/enhanceRules";
import { MEDIA_MAX_SECONDS, MEDIA_USD, mediaCredits, normaliseOptions, type MediaToolKey } from "@/lib/mediaTools";

type StepTools = Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"];
const MAX_POLLS = 160;

/** A message written for the customer (our own checks); anything else becomes the generic line. */
class CustomerMessage extends Error {}
const GENERIC = "This could not be finished. Nothing was charged; try again.";

function plain(error: unknown) {
  if (error instanceof CreditError || error instanceof CustomerMessage) return error.message;
  if (error instanceof CostGuardError) return "This file is too big for one job right now. Try a shorter video.";
  return GENERIC;
}

async function load(id: string) {
  const [row] = await db().select().from(enhanceJobs).where(eq(enhanceJobs.id, id)).limit(1);
  if (!row) throw new Error("Tool job not found");
  return row;
}

async function fail(jobId: string, message: string) {
  const job = await load(jobId);
  await refundEnhanceCredits(job);
  await db().update(enhanceJobs).set({ status: "failed", error: message, updatedAt: new Date(), finishedAt: new Date() }).where(eq(enhanceJobs.id, jobId));
  return { failed: message };
}

async function complete(job: EnhanceJobRow, path: string, mime: string, size?: { width: number; height: number }) {
  await db().update(enhanceJobs).set({ status: "completed", resultPath: path, resultMime: mime, error: null, ...(size ? { outWidth: size.width, outHeight: size.height } : {}), updatedAt: new Date(), finishedAt: new Date() }).where(eq(enhanceJobs.id, job.id));
  return { ok: true };
}

/** One paid call through the cost guard; the provider call itself runs in `fn`. */
async function paid<T>(job: EnhanceJobRow, service: CostService, action: string, estimatedUsd: number, fn: () => Promise<T>): Promise<{ value: T; entryId: string }> {
  const reserved = await reserveSpend({ service, action, estimatedUsd, fingerprintInput: { jobId: job.id, action }, userId: job.userId, meta: { tool: job.kind, seconds: job.seconds } });
  try {
    return { value: await fn(), entryId: reserved.entryId };
  } catch (error) {
    await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
    throw error;
  }
}

/**
 * The single-step media tools (25 Nov 2026): measure the file (free), reserve the credits, then
 *   - remove-text: the text remover on the picture, then the original sound put back under it;
 *   - captions: a transcript with timings, cut into short lines, rendered in the chosen style;
 *   - resize: one render to 1080×1920 (fill or fit over a blurred copy);
 *   - remove-background: the background remover, a transparent PNG.
 * Every paid call goes through the cost guard; results are copied to our storage; a failure refunds.
 */
export const mediaToolJob = inngest.createFunction(
  { id: "media-tool-job", name: "Media tools: remove text, captions, resize, background", retries: 0, concurrency: { limit: 1, key: "event.data.jobId" }, triggers: [mediaToolRequested] },
  async ({ event, step }) => {
    const jobId = event.data.jobId;

    const prep = await step.run("tool-prepare", () =>
      withDeadline("Reading the file", 6, async (): Promise<{ ok: true; tool: MediaToolKey; seconds: number; width: number; height: number } | { done: true } | { error: string }> => {
        const job = await load(jobId);
        if (job.status === "completed") return { done: true };
        if (job.status === "failed") return { error: job.error ?? GENERIC };
        try {
          const tool = job.kind as MediaToolKey;
          await db().update(enhanceJobs).set({ status: "processing", updatedAt: new Date() }).where(eq(enhanceJobs.id, job.id));
          if (tool === "remove-text" && !textRemovalConfigured()) throw new CustomerMessage("Removing on-screen text is not available right now. Try again later.");
          let seconds = 0, width = 0, height = 0;
          if (tool === "remove-background") {
            const blob = await downloadObject(job.sourcePath);
            const size = blob ? imageSize(new Uint8Array(await blob.slice(0, 256 * 1024).arrayBuffer())) : null;
            if (!size) throw new CustomerMessage("This image could not be read. Use a JPG, PNG or WebP file.");
            ({ width, height } = size);
          } else {
            const probe = await withRetries("Reading the video", async () => ingestFromUrl(await signedDownloadUrl(job.sourcePath, 6 * 3600)));
            if (!probe.width || !probe.height || !probe.duration) throw new CustomerMessage("This video could not be read. Use an MP4, MOV or WebM file.");
            if (probe.duration > MEDIA_MAX_SECONDS + 0.5) throw new CustomerMessage(`A video can be up to ${MEDIA_MAX_SECONDS / 60} minutes here. Trim it first.`);
            ({ width, height } = probe);
            seconds = probe.duration;
          }
          const credits = mediaCredits(tool, seconds);
          await db().update(enhanceJobs).set({ seconds: seconds || null, width, height, credits, updatedAt: new Date() }).where(eq(enhanceJobs.id, job.id));
          await reserveEnhanceCredits(job, credits);
          return { ok: true, tool, seconds, width, height };
        } catch (error) {
          return { error: plain(error) };
        }
      }),
    );
    if ("done" in prep) return { skipped: "already completed" };
    if ("error" in prep) return step.run("tool-failed-prepare", () => fail(jobId, prep.error));
    const { tool, seconds, width, height } = prep;

    /** Renders an edit with the render service, waits, copies the result to storage and completes the job. */
    async function renderAndStore(edit: { timeline: unknown; output: unknown }, fileName: string, size?: { width: number; height: number }) {
      const submitted = await step.run(`${tool}-render-submit`, () =>
        withDeadline("Starting the render", 6, async (): Promise<{ renderId: string; entryId: string; estimate: number } | { error: string }> => {
          const job = await load(jobId);
          try {
            const estimate = Math.round(Math.max(1, seconds) * MEDIA_USD.renderPerSecond * 1000) / 1000;
            const r = await paid(job, "shotstack", `${tool}_render`, estimate, () => withRetries("Starting the render", () => startRender(edit as Parameters<typeof startRender>[0], callbackUrlFor("shotstack"))));
            return { renderId: r.value.renderId, entryId: r.entryId, estimate };
          } catch (error) {
            return { error: plain(error) };
          }
        }),
      );
      if ("error" in submitted) return step.run(`${tool}-render-failed-start`, () => fail(jobId, submitted.error));
      for (let i = 0; i < MAX_POLLS; i++) {
        const r = await step.run(`${tool}-render-status-${i}`, async () => {
          const x = await getRender(submitted.renderId);
          return { status: x.status, url: x.url ?? null };
        });
        if (r.status === "done" && r.url) {
          return step.run(`${tool}-render-store`, () =>
            withDeadline("Saving the video", 10, async () => {
              const job = await load(jobId);
              try {
                const path = `users/${job.userId}/tools/${job.id}/${fileName}`;
                await copyFromUrl(r.url!, path, "video/mp4");
                await settleSpend(submitted.entryId, { status: "completed", actualUsd: submitted.estimate, basis: "list" });
                return complete(job, path, "video/mp4", size);
              } catch (error) {
                await settleSpend(submitted.entryId, { status: "completed", actualUsd: submitted.estimate, basis: "list" }).catch(() => null);
                return fail(jobId, plain(error));
              }
            }),
          );
        }
        if (r.status === "failed") {
          return step.run(`${tool}-render-failed`, async () => {
            await settleSpend(submitted.entryId, { status: "failed", actualUsd: 0 });
            return fail(jobId, GENERIC);
          });
        }
        await waitForJob(step as StepTools, `${tool}-render-wait-${i}`, "shotstack", submitted.renderId, pollDelaySeconds(i, cfg.pollSeconds));
      }
      return step.run(`${tool}-render-timeout`, async () => {
        await settleSpend(submitted.entryId, { status: "failed", actualUsd: 0 });
        return fail(jobId, "This took too long and was stopped. Nothing was charged; try again.");
      });
    }

    /* ---------- video to text ---------- */
    if (tool === "transcribe") {
      return step.run("transcribe-run", () =>
        withDeadline("Writing out what is said", 5, async () => {
          const job = await load(jobId);
          try {
            const videoUrl = await signedDownloadUrl(job.sourcePath, 6 * 3600);
            const estimate = Math.round(Math.max(1, seconds) * MEDIA_USD.transcribePerSecond * 10000) / 10000;
            const t = await paid(job, "heygen", "transcribe_tool", estimate, () => withRetries("Writing out what is said", () => transcribeSegments(videoUrl, `tool-transcribe-${job.id}`)));
            await settleSpend(t.entryId, { status: "completed", actualUsd: Math.round((t.value.seconds ?? seconds) * MEDIA_USD.transcribePerSecond * 10000) / 10000, basis: "list" });
            if (t.value.segments.length === 0) return fail(jobId, "No speech was found in this video. Nothing was charged.");
            const text = t.value.segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
            const folder = `users/${job.userId}/tools/${job.id}`;
            await putObject(`${folder}/transcript.srt`, new TextEncoder().encode(buildSrt(t.value.segments.map((s, i) => ({ index: i + 1, ...s })))), "application/x-subrip");
            await putObject(`${folder}/transcript.txt`, new TextEncoder().encode(text + "\n"), "text/plain");
            return complete(job, `${folder}/transcript.txt`, "text/plain");
          } catch (error) {
            return fail(jobId, plain(error));
          }
        }),
      );
    }

    /* ---------- resize ---------- */
    if (tool === "resize") {
      const job = await step.run("resize-edit", async () => {
        const row = await load(jobId);
        return { url: await signedDownloadUrl(row.sourcePath, 6 * 3600), mode: normaliseOptions("resize", row.options ?? {}).mode ?? "fill" };
      });
      return renderAndStore(buildReframeEdit({ videoUrl: job.url, seconds, mode: job.mode }), "vertical.mp4", { width: 1080, height: 1920 });
    }

    /* ---------- captions ---------- */
    if (tool === "captions") {
      const prepared = await step.run("captions-transcribe", () =>
        withDeadline("Writing out what is said", 5, async (): Promise<{ videoUrl: string; srtUrl: string; preset: string; position: "low" | "middle"; original: boolean } | { error: string }> => {
          const job = await load(jobId);
          try {
            const o = normaliseOptions("captions", job.options ?? {});
            const videoUrl = await signedDownloadUrl(job.sourcePath, 6 * 3600);
            const estimate = Math.round(Math.max(1, seconds) * MEDIA_USD.transcribePerSecond * 10000) / 10000;
            const t = await paid(job, "heygen", "captions_transcribe", estimate, () => withRetries("Writing out what is said", () => transcribeSegments(videoUrl, `tool-captions-${job.id}`)));
            await settleSpend(t.entryId, { status: "completed", actualUsd: Math.round((t.value.seconds ?? seconds) * MEDIA_USD.transcribePerSecond * 10000) / 10000, basis: "list" });
            if (t.value.segments.length === 0) throw new CustomerMessage("No speech was found in this video, so there is nothing to caption. Nothing was charged.");
            const style = CAPTION_PRESETS.find((p) => p.key === o.preset)?.style;
            const size = o.format === "original" ? { width, height } : undefined;
            const plan = captionChunkPlan({ size, captionStyle: style });
            const cues = chunkCues(t.value.segments.map((s, i) => ({ index: i + 1, ...s })), plan.chunkChars);
            const path = `users/${job.userId}/tools/${job.id}/captions.srt`;
            await putObject(path, new TextEncoder().encode(buildSrt(cues)), "application/x-subrip");
            return { videoUrl, srtUrl: await signedDownloadUrl(path, 6 * 3600), preset: o.preset ?? "bold", position: o.position ?? "low", original: o.format === "original" };
          } catch (error) {
            return { error: plain(error) };
          }
        }),
      );
      if ("error" in prepared) return step.run("captions-failed", () => fail(jobId, prepared.error));
      const style = CAPTION_PRESETS.find((p) => p.key === prepared.preset)?.style;
      const size = prepared.original ? { width, height } : undefined;
      return renderAndStore(buildCaptionEdit({ videoUrl: prepared.videoUrl, seconds, srtUrl: prepared.srtUrl, size, captionStyle: style, captionPosition: prepared.position, fit: "crop" }), "captioned.mp4", size ?? { width: 1080, height: 1920 });
    }

    /* ---------- remove-text ---------- */
    if (tool === "remove-text") {
      const job = await step.run("text-submit", () =>
        withDeadline("Starting the text removal", 5, async (): Promise<{ predictionId: string; entryId: string; estimate: number } | { error: string }> => {
          const row = await load(jobId);
          try {
            const estimate = Math.round(Math.max(1, seconds) * MEDIA_USD.textRemovalPerSecond * 1000) / 1000;
            const r = await paid(row, "replicate", "remove_text_tool", estimate, async () => withRetries("Starting the text removal", async () => startTextRemoval({ videoUrl: await signedDownloadUrl(row.sourcePath, 6 * 3600) })));
            return { predictionId: r.value.predictionId, entryId: r.entryId, estimate };
          } catch (error) {
            return { error: plain(error) };
          }
        }),
      );
      if ("error" in job) return step.run("text-failed-start", () => fail(jobId, job.error));
      for (let i = 0; i < MAX_POLLS; i++) {
        const st = await step.run(`text-status-${i}`, () => getTextRemoval(job.predictionId));
        if (st.status === "done") {
          const cleaned = await step.run("text-store", () =>
            withDeadline("Saving the cleaned picture", 10, async (): Promise<{ pictureUrl: string; soundUrl: string } | { error: string }> => {
              const row = await load(jobId);
              try {
                const bytes = await downloadTextRemovalOutput(st.outputUrl);
                const path = `users/${row.userId}/tools/${row.id}/cleaned-picture.mp4`;
                await putObject(path, bytes, "video/mp4");
                const actual = st.gpuSeconds !== null ? Math.round(st.gpuSeconds * TEXT_REMOVAL_USD_PER_GPU_SECOND * 1000) / 1000 : job.estimate;
                await settleSpend(job.entryId, { status: "completed", actualUsd: actual, basis: st.gpuSeconds !== null ? "provider" : "list", meta: { gpuSeconds: st.gpuSeconds } });
                return { pictureUrl: await signedDownloadUrl(path, 6 * 3600), soundUrl: await signedDownloadUrl(row.sourcePath, 6 * 3600) };
              } catch (error) {
                return { error: plain(error) };
              }
            }),
          );
          if ("error" in cleaned) return step.run("text-failed-store", () => fail(jobId, cleaned.error));
          // The remover returns the picture without sound: the original sound goes back under it.
          return renderAndStore(buildRemuxEdit({ pictureUrl: cleaned.pictureUrl, soundUrl: cleaned.soundUrl, seconds, size: { width, height } }), "without-text.mp4", { width, height });
        }
        if (st.status === "failed") {
          return step.run("text-failed", async () => {
            await settleSpend(job.entryId, { status: "failed", actualUsd: st.gpuSeconds !== null ? Math.round(st.gpuSeconds * TEXT_REMOVAL_USD_PER_GPU_SECOND * 1000) / 1000 : 0 });
            return fail(jobId, "The on-screen text could not be removed from this video. Nothing was charged; try again.");
          });
        }
        await step.sleep(`text-wait-${i}`, `${pollDelaySeconds(i, cfg.pollSeconds)}s`);
      }
      return step.run("text-timeout", async () => {
        await settleSpend(job.entryId, { status: "failed", actualUsd: 0 });
        return fail(jobId, "This took too long and was stopped. Nothing was charged; try again.");
      });
    }

    /* ---------- remove-background ---------- */
    const bg = await step.run("background-submit", () =>
      withDeadline("Starting the background removal", 5, async (): Promise<{ requestId: string; entryId: string } | { error: string }> => {
        const row = await load(jobId);
        try {
          const r = await paid(row, "fal", "remove_background", MEDIA_USD.backgroundPerImage, async () => withRetries("Starting the background removal", async () => submitBackgroundRemoval({ imageUrl: await signedDownloadUrl(row.sourcePath, 6 * 3600), webhookUrl: callbackUrlFor("fal") })));
          await db().update(enhanceJobs).set({ externalJobId: r.value.requestId, updatedAt: new Date() }).where(eq(enhanceJobs.id, row.id));
          return { requestId: r.value.requestId, entryId: r.entryId };
        } catch (error) {
          return { error: plain(error) };
        }
      }),
    );
    if ("error" in bg) return step.run("background-failed-start", () => fail(jobId, bg.error));
    for (let i = 0; i < MAX_POLLS; i++) {
      const s = await step.run(`background-status-${i}`, () => getBackgroundRemovalStatus(bg.requestId));
      if (s.status === "COMPLETED") {
        return step.run("background-store", () =>
          withDeadline("Saving the image", 5, async () => {
            const row = await load(jobId);
            try {
              const path = `users/${row.userId}/tools/${row.id}/no-background.png`;
              await copyFromUrl(s.url, path, "image/png");
              await settleSpend(bg.entryId, { status: "completed", actualUsd: MEDIA_USD.backgroundPerImage, basis: "list" });
              return complete(row, path, "image/png", { width, height });
            } catch (error) {
              await settleSpend(bg.entryId, { status: "completed", actualUsd: MEDIA_USD.backgroundPerImage, basis: "list" }).catch(() => null);
              return fail(jobId, plain(error));
            }
          }),
        );
      }
      if (s.status === "FAILED") {
        return step.run("background-failed", async () => {
          await settleSpend(bg.entryId, { status: "failed", actualUsd: 0 });
          return fail(jobId, GENERIC);
        });
      }
      await waitForJob(step as StepTools, `background-wait-${i}`, "fal", bg.requestId, pollDelaySeconds(i, cfg.pollSeconds));
    }
    return step.run("background-timeout", async () => {
      await settleSpend(bg.entryId, { status: "failed", actualUsd: 0 });
      return fail(jobId, "This took too long and was stopped. Nothing was charged; try again.");
    });
  },
);
