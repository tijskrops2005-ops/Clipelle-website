import "server-only";
import sharp from "sharp";
import { createFalClient, type FalClient } from "@fal-ai/client";

/**
 * Step 3 — product clip from a product photo, via fal.ai (server-only).
 *
 * Two ways to reach 9:16 before generating:
 *  (a) smart crop: find the product on its background and crop so it stays whole;
 *  (b) expand: Bria Expand (outpainting) fills only the missing area; we paste the
 *      original pixels back afterwards so the product itself is untouched.
 * Then an image-to-video model animates the 9:16 image into a short clip.
 *
 * Verified against fal.ai docs on 2026-10-19 (see docs/vendors/fal/capabilities.md).
 */

export const TARGET = { width: 1080, height: 1920 } as const;
const RATIO = 9 / 16;

/* ---------- models ---------- */

export type ClipModelKey = "minimax" | "kling";

export type ClipModel = {
  key: ClipModelKey;
  endpointId: string;
  label: string;
  blurb: string;
  /** USD per second of generated video, as published on fal.ai on the verification date. */
  usdPerSecond: number;
  buildInput: (args: { imageUrl: string; prompt: string; durationSeconds: number }) => Record<string, unknown>;
};

/** MiniMax H3 Max promo price ($0.052/s at 768p) runs until 2026-10-31; $0.08/s after. */
function minimaxUsdPerSecond(now = new Date()) {
  return now < new Date("2026-11-01T00:00:00Z") ? 0.052 : 0.08;
}

export const CLIP_MODELS: Record<ClipModelKey, ClipModel> = {
  minimax: {
    key: "minimax",
    endpointId: "minimax/h3-max/image-to-video",
    label: "MiniMax H3 Max",
    blurb: "Cheapest, fast, follows the photo as first frame. 768p.",
    usdPerSecond: minimaxUsdPerSecond(),
    buildInput: ({ imageUrl, prompt, durationSeconds }) => ({
      prompt,
      image_url: imageUrl,
      duration: durationSeconds,
      resolution: "768P",
      prompt_expansion_mode: "balanced",
    }),
  },
  kling: {
    key: "kling",
    endpointId: "fal-ai/kling-video/v3/pro/image-to-video",
    label: "Kling v3 Pro",
    blurb: "Higher fidelity to product details. Audio off to save cost.",
    usdPerSecond: 0.112,
    buildInput: ({ imageUrl, prompt, durationSeconds }) => ({
      prompt,
      start_image_url: imageUrl,
      duration: String(durationSeconds),
      generate_audio: false,
      negative_prompt: "blur, distort, low quality, extra text, changed logo, warped label",
    }),
  },
};

export const EXPAND_ENDPOINT = "fal-ai/bria/expand";
export const EXPAND_USD_PER_IMAGE = 0.04;
export const CLIP_SECONDS = 5;

export function estimateClipCost(model: ClipModelKey, seconds = CLIP_SECONDS) {
  return Math.round(CLIP_MODELS[model].usdPerSecond * seconds * 1000) / 1000;
}

/* ---------- client ---------- */

export class ProductClipError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 500) {
    super(message);
    this.name = "ProductClipError";
  }
}

function falClient(): FalClient {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw new ProductClipError("FAL_KEY is not set. Add it to .env.local and restart the dev server.", "missing_api_key");
  }
  return createFalClient({ credentials: key });
}

/* ---------- (a) analysis + smart crop (free, local) ---------- */

export type Analysis = {
  width: number;
  height: number;
  /** Bounding box of the product in original pixels. */
  bbox: { left: number; top: number; width: number; height: number };
  /** Share of the frame covered by the bbox (0–1). */
  coverage: number;
  /** Estimated background colour (sampled from the corners). */
  background: { r: number; g: number; b: number };
  /** False when the background is too busy to separate the product from it. */
  detected: boolean;
};

export type NineSixteenPlan = {
  /** True when the whole product fits in a 9:16 crop. */
  fits: boolean;
  recommended: "crop" | "expand";
  /** Crop window in original pixels (always computed, even if it cuts the product). */
  crop: { left: number; top: number; width: number; height: number };
  /** Canvas for expansion, in original pixels, plus where the original sits on it. */
  expand: { canvas: { width: number; height: number }; location: { x: number; y: number } };
};

/** Locate the product by colour distance from the corner background. Works best on plain backgrounds. */
export async function analyzeProductPhoto(input: Buffer): Promise<Analysis> {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new ProductClipError("Could not read the image.", "bad_image", 400);

  const sampleW = 160;
  const sampleH = Math.max(1, Math.round((height / width) * sampleW));
  const { data } = await sharp(input)
    .resize(sampleW, sampleH, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = (x: number, y: number) => {
    const i = (y * sampleW + x) * 3;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };

  // Background = mean of the four 6×6 corner patches.
  const patch = 6;
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (const [cx, cy] of [[0, 0], [sampleW - patch, 0], [0, sampleH - patch], [sampleW - patch, sampleH - patch]]) {
    for (let y = cy; y < cy + patch && y < sampleH; y++) {
      for (let x = cx; x < cx + patch && x < sampleW; x++) {
        const [r, g, b] = px(x, y);
        sr += r; sg += g; sb += b; n++;
      }
    }
  }
  const background = { r: Math.round(sr / n), g: Math.round(sg / n), b: Math.round(sb / n) };

  // Foreground mask: colour distance above a threshold; count per row/column.
  const threshold = 48;
  const rowHits = new Array<number>(sampleH).fill(0);
  const colHits = new Array<number>(sampleW).fill(0);
  let total = 0;
  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      const [r, g, b] = px(x, y);
      const d = Math.sqrt((r - background.r) ** 2 + (g - background.g) ** 2 + (b - background.b) ** 2);
      if (d > threshold) {
        rowHits[y]++; colHits[x]++; total++;
      }
    }
  }

  // Ignore specks: a row/column counts when at least 2% of it is foreground.
  const minRow = Math.max(1, Math.round(sampleW * 0.02));
  const minCol = Math.max(1, Math.round(sampleH * 0.02));
  const firstIdx = (arr: number[], min: number) => arr.findIndex((v) => v >= min);
  const lastIdx = (arr: number[], min: number) => arr.length - 1 - [...arr].reverse().findIndex((v) => v >= min);
  const top = firstIdx(rowHits, minRow), bottom = lastIdx(rowHits, minRow);
  const left = firstIdx(colHits, minCol), right = lastIdx(colHits, minCol);

  const share = total / (sampleW * sampleH);
  const detected = top >= 0 && left >= 0 && share > 0.01 && share < 0.9;

  const sx = width / sampleW, sy = height / sampleH;
  const bbox = detected
    ? {
        left: Math.floor(left * sx),
        top: Math.floor(top * sy),
        width: Math.ceil((right - left + 1) * sx),
        height: Math.ceil((bottom - top + 1) * sy),
      }
    : { left: 0, top: 0, width, height };

  return { width, height, bbox, coverage: (bbox.width * bbox.height) / (width * height), background, detected };
}

/** Decide between crop and expand for a 9:16 result. */
export function planNineSixteen(a: Analysis, margin = 0.04): NineSixteenPlan {
  const imageRatio = a.width / a.height;
  const cx = a.bbox.left + a.bbox.width / 2;
  const cy = a.bbox.top + a.bbox.height / 2;

  if (imageRatio >= RATIO) {
    // Wider than 9:16: crop the width, keep full height.
    const cropW = Math.round(a.height * RATIO);
    const needed = a.bbox.width * (1 + margin * 2);
    const fits = a.detected && needed <= cropW;
    const left = Math.round(Math.min(Math.max(0, cx - cropW / 2), a.width - cropW));
    const canvasH = Math.round(a.width / RATIO);
    return {
      fits,
      recommended: fits ? "crop" : "expand",
      crop: { left, top: 0, width: cropW, height: a.height },
      expand: { canvas: { width: a.width, height: canvasH }, location: { x: 0, y: Math.round((canvasH - a.height) / 2) } },
    };
  }
  // Taller than 9:16: crop the height, keep full width.
  const cropH = Math.round(a.width / RATIO);
  const needed = a.bbox.height * (1 + margin * 2);
  const fits = a.detected && needed <= cropH;
  const top = Math.round(Math.min(Math.max(0, cy - cropH / 2), a.height - cropH));
  const canvasW = Math.round(a.height * RATIO);
  return {
    fits,
    recommended: fits ? "crop" : "expand",
    crop: { left: 0, top, width: a.width, height: cropH },
    expand: { canvas: { width: canvasW, height: a.height }, location: { x: Math.round((canvasW - a.width) / 2), y: 0 } },
  };
}

export async function cropToNineSixteen(input: Buffer, crop: NineSixteenPlan["crop"]): Promise<Buffer> {
  return sharp(input)
    .extract(crop)
    .resize(TARGET.width, TARGET.height, { fit: "cover" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/* ---------- (b) expansion via Bria Expand (paid: $0.04) ---------- */

/** Cap the original so the expansion canvas stays well under Bria's 5000×5000 area limit. */
const EXPAND_MAX_SIDE = 1600;

export async function expandToNineSixteen(
  input: Buffer,
  analysis: Analysis,
  opts: { prompt?: string } = {},
): Promise<{ buffer: Buffer; costUsd: number; sourceUrl: string; expandedUrl: string }> {
  const fal = falClient();

  // 1. Downscale if needed (keeps the plan proportional).
  const scale = Math.min(1, EXPAND_MAX_SIDE / Math.max(analysis.width, analysis.height));
  const base = scale < 1
    ? await sharp(input).resize(Math.round(analysis.width * scale), Math.round(analysis.height * scale)).png().toBuffer()
    : await sharp(input).png().toBuffer();
  const baseMeta = await sharp(base).metadata();
  const w = baseMeta.width!, h = baseMeta.height!;
  const plan = planNineSixteen({ ...analysis, width: w, height: h, bbox: {
    left: Math.round(analysis.bbox.left * scale), top: Math.round(analysis.bbox.top * scale),
    width: Math.round(analysis.bbox.width * scale), height: Math.round(analysis.bbox.height * scale),
  } });

  // 2. Upload and expand. Bria keeps the original where we place it and paints only the rest.
  const sourceUrl = await fal.storage.upload(new Blob([new Uint8Array(base)], { type: "image/png" }));
  const bg = analysis.background;
  const prompt =
    opts.prompt?.trim() ||
    `seamless continuation of the same plain studio backdrop, soft even lighting, colour rgb(${bg.r},${bg.g},${bg.b}), no objects, no text`;

  const result = await fal.subscribe(EXPAND_ENDPOINT, {
    input: {
      image_url: sourceUrl,
      canvas_size: [plan.expand.canvas.width, plan.expand.canvas.height],
      original_image_size: [w, h],
      original_image_location: [plan.expand.location.x, plan.expand.location.y],
      prompt,
      negative_prompt: "text, logo, watermark, objects, people, hands",
    },
  });
  const expandedUrl = (result.data as { image?: { url?: string } }).image?.url;
  if (!expandedUrl) throw new ProductClipError("Bria Expand returned no image.", "expand_failed", 502);

  // 3. Paste the untouched original back over the expansion, then size to 1080×1920.
  const expanded = Buffer.from(await (await fetch(expandedUrl)).arrayBuffer());
  const expMeta = await sharp(expanded).metadata();
  const composited = await sharp(expanded)
    .composite([{ input: base, left: plan.expand.location.x, top: plan.expand.location.y }])
    .toBuffer();
  // Guard against an off-ratio canvas from the model: cover-resize to exact 9:16.
  const buffer = await sharp(composited)
    .resize(TARGET.width, TARGET.height, { fit: "cover" })
    .jpeg({ quality: 90 })
    .toBuffer();
  void expMeta;

  return { buffer, costUsd: EXPAND_USD_PER_IMAGE, sourceUrl, expandedUrl };
}

/* ---------- previews ---------- */

export async function toPreviewDataUrl(input: Buffer, maxSide = 480): Promise<string> {
  const buf = await sharp(input).resize({ width: maxSide, height: maxSide, fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

/* ---------- the clip itself (paid) ---------- */

export async function submitProductClip(args: {
  image: Buffer;
  model: ClipModelKey;
  prompt: string;
  durationSeconds?: number;
}): Promise<{ requestId: string; endpointId: string; imageUrl: string }> {
  const fal = falClient();
  const model = CLIP_MODELS[args.model];
  const durationSeconds = args.durationSeconds ?? CLIP_SECONDS;
  const imageUrl = await fal.storage.upload(new Blob([new Uint8Array(args.image)], { type: "image/jpeg" }));
  const { request_id } = await fal.queue.submit(model.endpointId, {
    input: model.buildInput({ imageUrl, prompt: args.prompt, durationSeconds }),
  });
  return { requestId: request_id, endpointId: model.endpointId, imageUrl };
}

export type ClipStatus =
  | { status: "IN_QUEUE" | "IN_PROGRESS"; queuePosition?: number }
  | { status: "COMPLETED"; videoUrl: string; raw: unknown }
  | { status: "FAILED"; error: string };

export async function getProductClipStatus(endpointId: string, requestId: string): Promise<ClipStatus> {
  const fal = falClient();
  try {
    const status = await fal.queue.status(endpointId, { requestId, logs: false });
    if (status.status !== "COMPLETED") {
      return { status: status.status, queuePosition: "queue_position" in status ? status.queue_position : undefined };
    }
    const result = await fal.queue.result(endpointId, { requestId });
    const videoUrl = (result.data as { video?: { url?: string } }).video?.url;
    if (!videoUrl) return { status: "FAILED", error: "The model finished without a video URL." };
    return { status: "COMPLETED", videoUrl, raw: result.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fal.ai error";
    return { status: "FAILED", error: message };
  }
}
