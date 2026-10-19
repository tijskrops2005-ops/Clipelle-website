import "server-only";

/**
 * Step 5 — final edit via Shotstack (server-only).
 * Presenter clip + product clip + hook text + TikTok-style captions + music + CTA end card → one 9:16 MP4.
 * Verified against shotstack.io/docs on 2026-10-19 (see docs/vendors/shotstack/capabilities.md).
 *
 * Environments: "stage" = sandbox (free, watermarked), "v1" = production (credits).
 */

export type ShotstackEnv = "stage" | "v1";

export class FinalEditError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 500) {
    super(message);
    this.name = "FinalEditError";
  }
}

export function shotstackEnv(): ShotstackEnv {
  return process.env.SHOTSTACK_ENV?.trim() === "v1" ? "v1" : "stage";
}

function requireApiKey() {
  const key = process.env.SHOTSTACK_API_KEY?.trim();
  if (!key) {
    throw new FinalEditError("SHOTSTACK_API_KEY is not set. Add it to .env.local and restart the dev server.", "missing_api_key");
  }
  return key;
}

async function shotstackFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "x-api-key": requireApiKey(), Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.error("[shotstack] error body:", JSON.stringify(body).slice(0, 4000));
    }
    const b = body as { message?: string; response?: { message?: string; error?: unknown; errors?: { message?: string }[] } } | null;
    const detail = b?.response?.message ?? b?.message ?? "";
    const list = b?.response?.errors?.map((e) => e.message).filter(Boolean).slice(0, 4).join(" · ");
    const extra = list ? ` — ${list}` : b?.response?.error ? ` ${JSON.stringify(b.response.error).slice(0, 300)}` : "";
    throw new FinalEditError(
      res.status === 401 ? "Shotstack rejected the API key. Check SHOTSTACK_API_KEY and SHOTSTACK_ENV in .env.local." : `Shotstack error ${res.status}: ${detail}${extra}`,
      res.status === 401 ? "unauthorized" : "shotstack_error",
      res.status,
    );
  }
  return body as T;
}

/* ---------- Ingest API: host local files so the renderer can fetch them ---------- */

const ingestCache = new Map<string, { url: string; duration?: number }>();

/** Uploads a local file via a signed URL and waits until Shotstack has it. Cached per process by key. */
export async function uploadAsset(
  cacheKey: string,
  data: Buffer,
  contentType: string,
): Promise<{ url: string; duration?: number }> {
  const cached = ingestCache.get(cacheKey);
  if (cached) return cached;

  const env = shotstackEnv();
  const base = `https://api.shotstack.io/ingest/${env}`;
  const signed = await shotstackFetch<{ data: { id: string; attributes: { url: string } } }>(`${base}/upload`, { method: "POST" });
  const put = await fetch(signed.data.attributes.url, { method: "PUT", body: new Uint8Array(data), headers: { "Content-Type": contentType } });
  if (!put.ok) throw new FinalEditError(`Upload to Shotstack failed (${put.status}).`, "upload_failed", 502);

  // Poll until the source is ready (usually a few seconds).
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const src = await shotstackFetch<{ data: { attributes: { status: string; source?: string; duration?: number } } }>(`${base}/sources/${signed.data.id}`);
    const a = src.data.attributes;
    if (a.status === "ready" && a.source) {
      const result = { url: a.source, duration: a.duration };
      ingestCache.set(cacheKey, result);
      return result;
    }
    if (a.status === "failed") throw new FinalEditError("Shotstack could not import the uploaded file.", "ingest_failed", 502);
  }
  throw new FinalEditError("Timed out waiting for Shotstack to import the file.", "ingest_timeout", 504);
}

/* ---------- The ad composition ---------- */

export type AdEditInput = {
  presenterUrl: string;
  /** Seconds of the presenter clip to use. */
  presenterSeconds: number;
  productClipUrl: string;
  /** Seconds available in the product clip (it is reused for hook and benefits). */
  productClipSeconds: number;
  musicUrl?: string;
  hook: string;
  benefits: [string, string, string];
  offer: { headline: string; cta: string };
  /** Brand colours (hex). Defaults match the app tokens. */
  colors?: { accent?: string; ink?: string; light?: string };
  captionLanguage?: string;
};

export const HOOK_SECONDS = 2;
export const BENEFITS_SECONDS = 4;
export const END_CARD_SECONDS = 3;

/** Builds the Shotstack Edit JSON for a vertical ad. Pure function: easy to test and version. */
export function buildAdEdit(input: AdEditInput) {
  const accent = input.colors?.accent ?? "#D43F1B";
  const ink = input.colors?.ink ?? "#111114";
  const light = input.colors?.light ?? "#FFFFFF";

  const P = Math.max(1, input.presenterSeconds);
  const hookStart = 0;
  const presenterStart = HOOK_SECONDS;
  const benefitsStart = presenterStart + P;
  const benefitsLen = Math.min(BENEFITS_SECONDS, Math.max(2, input.productClipSeconds - HOOK_SECONDS));
  const endStart = benefitsStart + benefitsLen;
  const total = endStart + END_CARD_SECONDS;

  const textBase = {
    font: { family: "Roboto", size: 64, weight: 900, color: light, opacity: 1 },
    align: { horizontal: "center", vertical: "middle" },
    stroke: { width: 0, color: ink, opacity: 1 },
  };

  const captions = {
    clips: [
      {
        asset: {
          type: "rich-caption",
          src: "alias://presenter",
          font: { family: "Roboto", size: 62, color: light, opacity: 1, weight: 900 },
          style: { textTransform: "uppercase" },
          stroke: { width: 7, color: ink, opacity: 1 },
          animation: { style: "pop" },
          active: { font: { color: light, background: accent }, stroke: { width: 7, color: ink, opacity: 1 } },
          border: { width: 0, color: ink, opacity: 1, radius: 16 },
          padding: { top: 6, right: 10, bottom: 6, left: 10 },
          align: { vertical: "middle" },
        },
        start: presenterStart,
        length: P,
        width: 900,
        height: 500,
        offset: { x: 0, y: -0.18 },
      },
    ],
  };

  const overlays = {
    clips: [
      // Hook: big sticker-style text in the first 2 seconds.
      {
        asset: {
          ...textBase,
          type: "rich-text",
          text: input.hook,
          font: { ...textBase.font, size: 118 },
          style: { lineHeight: 1.05, textTransform: "uppercase" },
          background: { color: accent, opacity: 1, borderRadius: 28, wrap: true },
          padding: 26,
          shadow: { offsetX: 0, offsetY: 10, blur: 22, color: ink, opacity: 0.45 },
          animation: { preset: "ascend", duration: 0.6, style: "word" },
        },
        start: hookStart,
        length: HOOK_SECONDS,
        width: 940,
        height: 900,
        offset: { x: 0, y: 0.06 },
        transition: { out: "fadeFast" },
      },
      // Benefits: three staggered pills on the product footage, stacked in the lower half.
      ...input.benefits.map((benefit, i) => ({
        asset: {
          ...textBase,
          type: "rich-text",
          text: benefit,
          font: { ...textBase.font, size: 56, weight: 800 },
          background: { color: ink, opacity: 0.85, borderRadius: 999, wrap: true },
          padding: 24,
          animation: { preset: "ascend", duration: 0.5, style: "word" },
        },
        start: benefitsStart + 0.3 + i * 0.9,
        length: benefitsLen - 0.3 - i * 0.9,
        width: 940,
        height: 150,
        offset: { x: 0, y: -0.02 - i * 0.11 },
      })),
      // End card headline + CTA pill.
      {
        asset: {
          ...textBase,
          type: "rich-text",
          text: input.offer.headline,
          font: { ...textBase.font, size: 88 },
          style: { lineHeight: 1.08 },
          animation: { preset: "fadeIn", duration: 0.5 },
        },
        start: endStart,
        length: END_CARD_SECONDS,
        width: 900,
        height: 520,
        offset: { x: 0, y: 0.1 },
      },
      {
        asset: {
          ...textBase,
          type: "rich-text",
          text: input.offer.cta,
          font: { ...textBase.font, size: 56, weight: 800 },
          background: { color: accent, opacity: 1, borderRadius: 999, wrap: true },
          padding: 30,
          animation: { preset: "ascend", duration: 0.6, style: "word" },
        },
        start: endStart + 0.35,
        length: END_CARD_SECONDS - 0.35,
        width: 900,
        height: 160,
        offset: { x: 0, y: -0.14 },
      },
    ],
  };

  const video = {
    clips: [
      { asset: { type: "video", src: input.productClipUrl, volume: 0, trim: 0 }, start: hookStart, length: HOOK_SECONDS, fit: "crop", effect: "zoomInSlow" },
      { alias: "presenter", asset: { type: "video", src: input.presenterUrl, volume: 1, trim: 0 }, start: presenterStart, length: P, fit: "crop", transition: { in: "fadeFast" } },
      { asset: { type: "video", src: input.productClipUrl, volume: 0, trim: 0 }, start: benefitsStart, length: benefitsLen, fit: "crop", effect: "zoomOutSlow", transition: { in: "fadeFast", out: "fadeFast" } },
    ],
  };

  const music = input.musicUrl
    ? { clips: [{ asset: { type: "audio", src: input.musicUrl, volume: 0.18, effect: "fadeInFadeOut" }, start: 0, length: total }] }
    : null;

  return {
    timeline: {
      background: ink,
      tracks: [captions, overlays, video, ...(music ? [music] : [])],
    },
    output: { format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 },
    meta: { totalSeconds: total, presenterStart, benefitsStart, endStart },
  };
}

/* ---------- Render ---------- */

/* ---------- Workflow B: captions + 9:16 on a translated video ---------- */

export type CaptionEditInput = {
  videoUrl: string;
  /** Length of the translated video in seconds. */
  seconds: number;
  /** Public SRT URL (HeyGen's srt_caption_url). Omitted: Shotstack transcribes the audio itself. */
  srtUrl?: string;
  /** "crop" fills the 9:16 frame (centred); "contain" letterboxes the whole picture on an ink background. */
  fit?: "crop" | "contain";
  colors?: { accent?: string; ink?: string; light?: string };
};

/** One video track plus TikTok-style captions, output 1080×1920. Same caption style as the ad. */
export function buildCaptionEdit(input: CaptionEditInput) {
  const accent = input.colors?.accent ?? "#D43F1B";
  const ink = input.colors?.ink ?? "#111114";
  const light = input.colors?.light ?? "#FFFFFF";
  const total = Math.max(1, Math.round(input.seconds * 10) / 10);

  const captions = {
    clips: [
      {
        asset: {
          type: "rich-caption",
          src: input.srtUrl ?? "alias://source",
          font: { family: "Roboto", size: 62, color: light, opacity: 1, weight: 900 },
          style: { textTransform: "uppercase" },
          stroke: { width: 7, color: ink, opacity: 1 },
          animation: { style: "pop" },
          active: { font: { color: light, background: accent }, stroke: { width: 7, color: ink, opacity: 1 } },
          border: { width: 0, color: ink, opacity: 1, radius: 16 },
          padding: { top: 6, right: 10, bottom: 6, left: 10 },
          align: { vertical: "middle" },
        },
        start: 0,
        length: total,
        width: 900,
        height: 500,
        offset: { x: 0, y: -0.18 },
      },
    ],
  };

  const video = {
    clips: [
      {
        alias: "source",
        asset: { type: "video", src: input.videoUrl, volume: 1, trim: 0 },
        start: 0,
        length: total,
        fit: input.fit ?? "crop",
      },
    ],
  };

  return {
    timeline: { background: ink, tracks: [captions, video] },
    output: { format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 },
    meta: { totalSeconds: total },
  };
}

/* ---------- Render ---------- */

export type ShotstackEdit = {
  timeline: Record<string, unknown>;
  output: Record<string, unknown>;
  meta: { totalSeconds: number } & Record<string, unknown>;
};

export type RenderStatus = "queued" | "fetching" | "preprocessing" | "rendering" | "generating" | "saving" | "done" | "failed";

export async function startRender(edit: ShotstackEdit, callbackUrl?: string) {
  const env = shotstackEnv();
  const { meta, ...payload } = edit;
  const body = callbackUrl ? { ...payload, callback: callbackUrl } : payload;
  const res = await shotstackFetch<{ response: { id: string; message: string } }>(`https://api.shotstack.io/edit/${env}/render`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { renderId: res.response.id, env, meta };
}

export async function getRender(renderId: string) {
  const env = shotstackEnv();
  const res = await shotstackFetch<{
    response: { id: string; status: RenderStatus; url?: string; duration?: number; renderTime?: number; error?: string; poster?: string; thumbnail?: string };
  }>(`https://api.shotstack.io/edit/${env}/render/${encodeURIComponent(renderId)}`);
  return res.response;
}
