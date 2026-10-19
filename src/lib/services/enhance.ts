import "server-only";
import { createFalClient } from "@fal-ai/client";

/**
 * Optional last step of Workflow B — picture enhancement with Topaz on fal.ai.
 * Endpoint `fal-ai/topaz/upscale/video` (verified 2026-10-19): input `video_url`, `model`
 * (default "Proteus"), `upscale_factor` (default 2), `H264_output`; output `video.url`.
 * Price (fal.ai pricing page, Oct 2026): $0.01 per output second up to 720p, $0.02 up to 1080p.
 */
export const ENHANCE_ENDPOINT = "fal-ai/topaz/upscale/video";

export class EnhanceError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 500) {
    super(message);
    this.name = "EnhanceError";
  }
}

function fal() {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new EnhanceError("FAL_KEY is not set. Add it to .env.local and restart the dev server.", "missing_api_key");
  return createFalClient({ credentials: key });
}

/** Indicative cost: we keep the output at or below 1080p, so $0.02 per second. */
export function estimateEnhanceUsd(seconds: number) {
  return Math.round(Math.max(1, seconds) * 0.02 * 100) / 100;
}

export async function submitEnhance(input: { videoUrl: string; upscaleFactor?: number }) {
  const { request_id } = await fal().queue.submit(ENHANCE_ENDPOINT, {
    input: { video_url: input.videoUrl, model: "Proteus", upscale_factor: input.upscaleFactor ?? 1, H264_output: true },
  });
  return { requestId: request_id, endpointId: ENHANCE_ENDPOINT };
}

export type EnhanceStatus = { status: "IN_QUEUE" | "IN_PROGRESS" } | { status: "COMPLETED"; videoUrl: string } | { status: "FAILED"; error: string };

export async function getEnhanceStatus(requestId: string): Promise<EnhanceStatus> {
  const client = fal();
  try {
    const status = await client.queue.status(ENHANCE_ENDPOINT, { requestId, logs: false });
    if (status.status !== "COMPLETED") return { status: status.status };
    const result = await client.queue.result(ENHANCE_ENDPOINT, { requestId });
    const url = (result.data as { video?: { url?: string } }).video?.url;
    return url ? { status: "COMPLETED", videoUrl: url } : { status: "FAILED", error: "The enhancer finished without a video URL." };
  } catch (error) {
    return { status: "FAILED", error: error instanceof Error ? error.message : "Unknown fal.ai error" };
  }
}
