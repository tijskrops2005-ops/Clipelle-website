import "server-only";

/**
 * Optional first step of Workflow B (26 Oct 2026): remove text burned into the picture (titles,
 * captions, stickers) before the video is translated, so the old-language text does not stay on
 * the new version. Runs once per project, on the source video.
 *
 * Provider: Replicate, model `hjunior29/video-text-remover` (text detection + inpainting per frame;
 * input `video`, `method` hybrid | inpaint | inpaint_ns | blur | black | background, `conf_threshold`,
 * `iou_threshold`, `margin`; output: one file URL). Checked on replicate.com on 26 Oct 2026. HTTP API:
 * `POST /v1/predictions` with `version`, `GET /v1/predictions/{id}` (status starting | processing |
 * succeeded | failed | canceled, `metrics.predict_time`), output files need the Authorization header
 * and are deleted after an hour, so the result is copied to our storage at once.
 * The provider is swappable behind these three functions.
 */
export const TEXT_REMOVAL_MODEL = process.env.REPLICATE_TEXT_REMOVAL_MODEL?.trim() || "hjunior29/video-text-remover";

/**
 * Indicative GPU cost per second of video. Replicate bills hardware time (not stated on the model
 * page); we assume up to 4 s of GPU time per video second at ~$0.0014/s (A100 list price) and
 * settle with the real `predict_time` afterwards.
 */
export const TEXT_REMOVAL_USD_PER_GPU_SECOND = Number(process.env.REPLICATE_USD_PER_GPU_SECOND) > 0 ? Number(process.env.REPLICATE_USD_PER_GPU_SECOND) : 0.0014;
const GPU_SECONDS_PER_VIDEO_SECOND = 4;

export class TextRemovalError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 500) {
    super(message);
    this.name = "TextRemovalError";
  }
}

export function textRemovalConfigured() {
  return Boolean(process.env.REPLICATE_API_TOKEN?.trim());
}

function token() {
  const t = process.env.REPLICATE_API_TOKEN?.trim();
  if (!t) throw new TextRemovalError("Removing on-screen text is not switched on yet (REPLICATE_API_TOKEN is not set).", "missing_api_key", 503);
  return t;
}

async function replicate<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.replicate.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => ({}))) as T & { detail?: string; title?: string };
  // Never echo the token; the provider's own message is enough.
  if (!res.ok) throw new TextRemovalError(`The text remover answered ${res.status}: ${body.detail ?? body.title ?? "unknown error"}`, "provider_error", res.status >= 500 ? 502 : 400);
  return body;
}

export function estimateTextRemovalUsd(seconds: number) {
  return Math.round(Math.max(1, seconds) * GPU_SECONDS_PER_VIDEO_SECOND * TEXT_REMOVAL_USD_PER_GPU_SECOND * 1000) / 1000;
}

/** The model's current version id (community models are run by version). */
async function latestVersion() {
  const model = await replicate<{ latest_version?: { id?: string } }>(`/models/${TEXT_REMOVAL_MODEL}`);
  const id = model.latest_version?.id;
  if (!id) throw new TextRemovalError("The text remover has no published version.", "no_version", 502);
  return id;
}

export async function startTextRemoval(input: { videoUrl: string; callbackUrl?: string }) {
  const version = await latestVersion();
  const prediction = await replicate<{ id: string; status: string }>("/predictions", {
    method: "POST",
    body: JSON.stringify({
      version,
      // "hybrid" is the model's recommended context-aware inpainting; a small margin covers outlines and shadows.
      input: { video: input.videoUrl, method: "hybrid", conf_threshold: 0.25, margin: 8 },
      ...(input.callbackUrl ? { webhook: input.callbackUrl, webhook_events_filter: ["completed"] } : {}),
    }),
  });
  return { predictionId: prediction.id };
}

export type TextRemovalStatus =
  | { status: "running" }
  | { status: "done"; outputUrl: string; gpuSeconds: number | null }
  | { status: "failed"; error: string; gpuSeconds: number | null };

export async function getTextRemoval(predictionId: string): Promise<TextRemovalStatus> {
  const p = await replicate<{ status: string; output?: unknown; error?: unknown; metrics?: { predict_time?: number } }>(`/predictions/${predictionId}`);
  const gpuSeconds = typeof p.metrics?.predict_time === "number" ? p.metrics.predict_time : null;
  if (p.status === "succeeded") {
    const url = typeof p.output === "string" ? p.output : Array.isArray(p.output) && typeof p.output[0] === "string" ? p.output[0] : null;
    return url ? { status: "done", outputUrl: url, gpuSeconds } : { status: "failed", error: "The text remover finished without a video.", gpuSeconds };
  }
  if (p.status === "failed" || p.status === "canceled") return { status: "failed", error: typeof p.error === "string" ? p.error : "The text remover could not process this video.", gpuSeconds };
  return { status: "running" };
}

/** Downloads the result (Replicate file URLs need the token) so it can be stored with storeBytes. */
export async function downloadTextRemovalOutput(url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` }, signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new TextRemovalError(`Could not download the cleaned video (${res.status}).`, "download_failed", 502);
  return new Uint8Array(await res.arrayBuffer());
}
