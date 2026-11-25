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

/* ---------- The enhancer tool (25 Nov 2026): video with a chosen factor, and images ---------- */

/**
 * Topaz image upscale on fal.ai, `fal-ai/topaz/upscale/image` (verified 25 Nov 2026): input `image_url`,
 * `model` (default "Standard V2"), `upscale_factor`, `output_format` jpeg|png, `face_enhancement`
 * (default true); output `image.url`. Price: $0.08 per image up to 24 MP output.
 */
export const IMAGE_ENHANCE_ENDPOINT = "fal-ai/topaz/upscale/image";

export async function submitVideoEnhance(input: { videoUrl: string; factor: number; webhookUrl?: string }) {
  const { request_id } = await fal().queue.submit(ENHANCE_ENDPOINT, {
    input: { video_url: input.videoUrl, model: "Proteus", upscale_factor: input.factor, H264_output: true },
    ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
  });
  return { requestId: request_id };
}

export async function submitImageEnhance(input: { imageUrl: string; factor: number; png: boolean; webhookUrl?: string }) {
  const { request_id } = await fal().queue.submit(IMAGE_ENHANCE_ENDPOINT, {
    input: { image_url: input.imageUrl, model: "Standard V2", upscale_factor: input.factor, output_format: input.png ? "png" : "jpeg", face_enhancement: true },
    ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
  });
  return { requestId: request_id };
}

export type ToolEnhanceStatus = { status: "IN_QUEUE" | "IN_PROGRESS" } | { status: "COMPLETED"; url: string; contentType?: string } | { status: "FAILED"; error: string };

/** Status of an enhancer job of either kind; a finished job returns the file's temporary URL. */
export async function getToolEnhanceStatus(kind: "video" | "image", requestId: string): Promise<ToolEnhanceStatus> {
  const client = fal();
  const endpoint = kind === "video" ? ENHANCE_ENDPOINT : IMAGE_ENHANCE_ENDPOINT;
  try {
    const status = await client.queue.status(endpoint, { requestId, logs: false });
    if (status.status !== "COMPLETED") return { status: status.status };
    const result = await client.queue.result(endpoint, { requestId });
    const data = result.data as { video?: { url?: string; content_type?: string }; image?: { url?: string; content_type?: string } };
    const file = kind === "video" ? data.video : data.image;
    return file?.url ? { status: "COMPLETED", url: file.url, contentType: file.content_type } : { status: "FAILED", error: "The enhancer finished without a file." };
  } catch (error) {
    return { status: "FAILED", error: error instanceof Error ? error.message : "Unknown enhancer error" };
  }
}

/**
 * Background removal for product photos (25 Nov 2026): Bria RMBG 2.0 on fal.ai,
 * `fal-ai/bria/background/remove` (verified 25 Nov 2026): input `image_url`; output `image.url`, a PNG
 * with transparency. $0.018 per image without a prompt; trained on licensed data (commercial use).
 */
export const BACKGROUND_ENDPOINT = "fal-ai/bria/background/remove";

export async function submitBackgroundRemoval(input: { imageUrl: string; webhookUrl?: string }) {
  const { request_id } = await fal().queue.submit(BACKGROUND_ENDPOINT, { input: { image_url: input.imageUrl }, ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}) });
  return { requestId: request_id };
}

export async function getBackgroundRemovalStatus(requestId: string): Promise<ToolEnhanceStatus> {
  const client = fal();
  try {
    const status = await client.queue.status(BACKGROUND_ENDPOINT, { requestId, logs: false });
    if (status.status !== "COMPLETED") return { status: status.status };
    const result = await client.queue.result(BACKGROUND_ENDPOINT, { requestId });
    const image = (result.data as { image?: { url?: string; content_type?: string } }).image;
    return image?.url ? { status: "COMPLETED", url: image.url, contentType: image.content_type ?? "image/png" } : { status: "FAILED", error: "The background removal finished without an image." };
  } catch (error) {
    return { status: "FAILED", error: error instanceof Error ? error.message : "Unknown background removal error" };
  }
}
