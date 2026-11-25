import { eq } from "drizzle-orm";
import { inngest, enhanceRequested } from "@/lib/inngest/client";
import { db, enhanceJobs } from "@/lib/db";
import { downloadObject, signedDownloadUrl, copyFromUrl } from "@/lib/storage";
import { ingestFromUrl } from "@/lib/services/finalEdit";
import { getToolEnhanceStatus, submitImageEnhance, submitVideoEnhance } from "@/lib/services/enhance";
import { reserveSpend, settleSpend, CostGuardError } from "@/lib/services/costGuard";
import { CreditError } from "@/lib/credits";
import { callbackUrlFor } from "@/lib/webhooks/incoming";
import { pollDelaySeconds, waitForJob, withDeadline, withRetries } from "@/lib/workflow/steps";
import { workflowSettings as cfg } from "@/lib/workflow/settings";
import { enhanceLimits, refundEnhanceCredits, reserveEnhanceCredits, type EnhanceJobRow } from "@/lib/data/enhance";
import { ENHANCE_USD, VIDEO_MAX_SECONDS, imageCredits, imageOutput, imageSize, isHighFps, videoCredits, videoEstimateUsd, videoOutput, type ImageTarget, type VideoTarget } from "@/lib/enhanceRules";

type StepTools = Parameters<Parameters<typeof inngest.createFunction>[1]>[0]["step"];
const MAX_POLLS = 160;

/** A message written for the customer (our own checks); anything else becomes the generic line. */
class CustomerMessage extends Error {}

/** A plain message for the customer; provider names and dollar amounts stay out. */
function plain(error: unknown) {
  if (error instanceof CreditError || error instanceof CustomerMessage) return error.message;
  if (error instanceof CostGuardError) return "This file is too big for one job right now. Try a shorter video or a smaller size.";
  return "The enhancement could not be finished. Nothing was charged; try again.";
}

async function load(id: string) {
  const [row] = await db().select().from(enhanceJobs).where(eq(enhanceJobs.id, id)).limit(1);
  if (!row) throw new Error("Enhance job not found");
  return row;
}

async function fail(job: EnhanceJobRow, message: string) {
  await refundEnhanceCredits(job);
  await db().update(enhanceJobs).set({ status: "failed", error: message, updatedAt: new Date(), finishedAt: new Date() }).where(eq(enhanceJobs.id, job.id));
  return { failed: message };
}

/**
 * The enhancer (25 Nov 2026): measure the file (free), work out the factor and the credits, reserve
 * the credits, start the paid enhancement through the cost guard, wait for it (webhook or polling),
 * copy the result to our storage and settle. A failure at any point refunds the credits.
 */
export const enhanceJob = inngest.createFunction(
  { id: "enhance-job", name: "Enhancer: upscale a video or image", retries: 0, concurrency: { limit: 1, key: "event.data.jobId" }, triggers: [enhanceRequested] },
  async ({ event, step }) => {
    const jobId = event.data.jobId;

    const submitted = await step.run("enhance-submit", () =>
      withDeadline("Starting the enhancement", 8, async (): Promise<{ requestId: string; entryId: string; estimate: number } | { error: string } | { done: true }> => {
        const job = await load(jobId);
        if (job.status === "completed") return { done: true };
        if (job.status === "failed") return { error: job.error ?? "Failed" };
        try {
          await db().update(enhanceJobs).set({ status: "processing", updatedAt: new Date() }).where(eq(enhanceJobs.id, job.id));
          const sourceUrl = await signedDownloadUrl(job.sourcePath, 6 * 3600);
          let factor: number, outW: number, outH: number, credits: number, estimate: number;
          let measured: Partial<typeof enhanceJobs.$inferInsert> = {};
          if (job.kind === "video") {
            const probe = await withRetries("Reading the video", () => ingestFromUrl(sourceUrl));
            if (!probe.width || !probe.height || !probe.duration) throw new CustomerMessage("This video could not be read. Use an MP4, MOV or WebM file.");
            const target = job.target as VideoTarget;
            const max = (isHighFps(probe.fps) ? enhanceLimits().maxSecondsHighFps : enhanceLimits().maxSeconds)[target] ?? VIDEO_MAX_SECONDS;
            if (probe.duration > max + 0.5) throw new CustomerMessage(`At ${target === "4k" ? "4K" : "1080p"} this video can be up to ${max} seconds${isHighFps(probe.fps) ? " (it plays at more than 30 frames per second)" : ""}. Trim it or pick ${target === "4k" ? "1080p" : "a shorter video"}.`);
            const out = videoOutput(probe.width, probe.height, target);
            factor = out.factor;
            outW = out.width;
            outH = out.height;
            credits = videoCredits(probe.duration, target, probe.fps);
            estimate = videoEstimateUsd(probe.duration, probe.width, probe.height, target, probe.fps);
            measured = { seconds: probe.duration, fps: probe.fps ?? null, width: probe.width, height: probe.height };
          } else {
            const blob = await downloadObject(job.sourcePath);
            if (!blob) throw new CustomerMessage("The image is missing from storage. Upload it again.");
            const size = imageSize(new Uint8Array(await blob.slice(0, 256 * 1024).arrayBuffer()));
            if (!size) throw new CustomerMessage("This image could not be read. Use a JPG, PNG or WebP file.");
            const out = imageOutput(size.width, size.height, job.target as ImageTarget);
            if (out.factor <= 1) throw new CustomerMessage("This image is already 24 megapixels or more; it cannot be made bigger here.");
            factor = out.factor;
            outW = out.width;
            outH = out.height;
            credits = imageCredits();
            estimate = ENHANCE_USD.image;
            measured = { width: size.width, height: size.height };
          }
          await db().update(enhanceJobs).set({ ...measured, factor, outWidth: outW, outHeight: outH, credits, updatedAt: new Date() }).where(eq(enhanceJobs.id, job.id));
          await reserveEnhanceCredits(job, credits);
          const reserved = await reserveSpend({ service: "fal", action: job.kind === "video" ? "enhance_video" : "enhance_image", estimatedUsd: estimate, fingerprintInput: { jobId: job.id }, userId: job.userId, meta: { target: job.target, factor, outWidth: outW, outHeight: outH, seconds: measured.seconds ?? null } });
          try {
            const webhookUrl = callbackUrlFor("fal");
            const r =
              job.kind === "video"
                ? await withRetries("Starting the enhancement", () => submitVideoEnhance({ videoUrl: sourceUrl, factor, webhookUrl }))
                : await withRetries("Starting the enhancement", () => submitImageEnhance({ imageUrl: sourceUrl, factor, png: job.sourceMime === "image/png", webhookUrl }));
            await db().update(enhanceJobs).set({ externalJobId: r.requestId, updatedAt: new Date() }).where(eq(enhanceJobs.id, job.id));
            return { requestId: r.requestId, entryId: reserved.entryId, estimate };
          } catch (error) {
            await settleSpend(reserved.entryId, { status: "failed", actualUsd: 0 });
            throw error;
          }
        } catch (error) {
          return { error: plain(error) };
        }
      }),
    );
    if ("done" in submitted) return { skipped: "already completed" };
    if ("error" in submitted) return step.run("enhance-failed-start", async () => fail(await load(jobId), submitted.error));

    const kind = (await step.run("enhance-kind", async () => (await load(jobId)).kind)) as "video" | "image";
    for (let i = 0; i < MAX_POLLS; i++) {
      const s = await step.run(`enhance-status-${i}`, () => getToolEnhanceStatus(kind, submitted.requestId));
      if (s.status === "COMPLETED") {
        return step.run("enhance-store", () =>
          withDeadline("Saving the enhanced file", 10, async () => {
            const job = await load(jobId);
            try {
              const ext = kind === "video" ? "mp4" : s.contentType === "image/png" ? "png" : "jpg";
              const path = `users/${job.userId}/enhance/${job.id}/enhanced.${ext}`;
              await copyFromUrl(s.url, path, kind === "video" ? "video/mp4" : `image/${ext === "jpg" ? "jpeg" : ext}`);
              await settleSpend(submitted.entryId, { status: "completed", actualUsd: submitted.estimate, basis: "list" });
              await db().update(enhanceJobs).set({ status: "completed", resultPath: path, resultMime: kind === "video" ? "video/mp4" : `image/${ext === "jpg" ? "jpeg" : ext}`, error: null, updatedAt: new Date(), finishedAt: new Date() }).where(eq(enhanceJobs.id, job.id));
              return { ok: true };
            } catch (error) {
              await settleSpend(submitted.entryId, { status: "completed", actualUsd: submitted.estimate, basis: "list" }).catch(() => null);
              return fail(job, plain(error));
            }
          }),
        );
      }
      if (s.status === "FAILED") {
        return step.run("enhance-failed", async () => {
          await settleSpend(submitted.entryId, { status: "failed", actualUsd: 0 });
          return fail(await load(jobId), "The enhancement could not be finished. Nothing was charged; try again.");
        });
      }
      await waitForJob(step as StepTools, `enhance-wait-${i}`, "fal", submitted.requestId, pollDelaySeconds(i, cfg.pollSeconds));
    }
    return step.run("enhance-timeout", async () => {
      await settleSpend(submitted.entryId, { status: "failed", actualUsd: 0 });
      return fail(await load(jobId), "The enhancement took too long and was stopped. Nothing was charged; try again.");
    });
  },
);
