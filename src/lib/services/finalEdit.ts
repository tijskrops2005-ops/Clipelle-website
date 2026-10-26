import "server-only";
import { CAPTION_SIZE_PX, DEFAULT_CAPTION_STYLE as DEFAULT_TRANSLATE_LOOK, captionStyleOf, isLightColor, type CaptionHighlight, type CaptionStyleChoice } from "@/lib/captionOptions";
import { adLayout } from "@/lib/adLayout";
import { DEFAULT_CAPTION_STYLE, DEFAULT_FONT, FONT_KEYS, type CaptionStyle } from "@/lib/adOptions";

/**
 * Step 5 — final edit via Shotstack (server-only).
 * Presenter clip + product clip + TikTok-style captions (the only text on screen) → one 9:16 MP4. No music (removed 2026-10-21).
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
    signal: init.signal ?? AbortSignal.timeout(30_000),
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

/** Lets Shotstack fetch a file from a URL and reports its dimensions and length (free). */
export async function ingestFromUrl(url: string): Promise<{ url: string; width?: number; height?: number; duration?: number; fps?: number }> {
  const env = shotstackEnv();
  const base = `https://api.shotstack.io/ingest/${env}`;
  const created = await shotstackFetch<{ data: { id: string } }>(`${base}/sources`, { method: "POST", body: JSON.stringify({ url }) });
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const src = await shotstackFetch<{ data: { attributes: { status: string; source?: string; width?: number; height?: number; duration?: number; fps?: number } } }>(`${base}/sources/${created.data.id}`);
    const a = src.data.attributes;
    if (a.status === "ready" && a.source) return { url: a.source, width: a.width, height: a.height, duration: a.duration, fps: a.fps };
    if (a.status === "failed") throw new FinalEditError("Shotstack could not import the video.", "ingest_failed", 502);
  }
  throw new FinalEditError("Timed out waiting for Shotstack to import the video.", "ingest_timeout", 504);
}

/* ---------- The ad composition ---------- */

export type AdEditInput = {
  presenterUrl: string;
  /** Real length of the presenter video: it is the base of the whole ad. */
  presenterSeconds: number;
  productClipUrl: string;
  /** Seconds available in the one product clip (reused for every overlay). */
  productClipSeconds: number;
  /** The prepared 9:16 product photo; odd overlays show it with a slow pan for variety. Optional. */
  productPhotoUrl?: string;
  /** Brand colours (hex). Defaults match the app tokens. */
  colors?: { accent?: string; ink?: string; light?: string };
  /** Brand style (Shotstack built-in font, caption look, logo URL top-right). Missing = defaults. */
  brand?: { font?: string; captionStyle?: string; logoUrl?: string };
  captionLanguage?: string;
  /**
   * Dev/sandbox only: when the presenter clip is shorter than this, repeat it back to back
   * to reach this length, so a 60-second layout can be checked with a 9-second demo clip.
   */
  fillToSeconds?: number;
};


/**
 * Builds the Shotstack Edit JSON for a vertical ad. Pure function: easy to test and version.
 * The presenter video runs the whole ad (picture and voice); product footage is laid over it at
 * the moments from adLayout() with varied camera moves; captions over everything (the only text on
 * screen), optional logo top right. No music: the presenter audio is the whole soundtrack.
 */
export function buildAdEdit(input: AdEditInput) {
  const accent = input.colors?.accent ?? "#D43F1B";
  const ink = input.colors?.ink ?? "#111114";
  const light = input.colors?.light ?? "#FFFFFF";

  const presenterLen = Math.max(1, Math.round(input.presenterSeconds * 10) / 10);
  const fill = input.fillToSeconds && input.fillToSeconds > presenterLen ? Math.round(input.fillToSeconds * 10) / 10 : null;
  const total = fill ?? presenterLen;
  const layout = adLayout(total, Math.max(1, input.productClipSeconds));

  // Fonts: only Shotstack's built-in families (rich-text docs, 2026-10-19); anything else falls back to Roboto.
  const family = (FONT_KEYS as readonly string[]).includes(input.brand?.font ?? "") ? (input.brand!.font as string) : DEFAULT_FONT;
  const captionLook = (["bold", "clean", "karaoke"].includes(input.brand?.captionStyle ?? "") ? input.brand!.captionStyle : DEFAULT_CAPTION_STYLE) as CaptionStyle;
  // Three caption looks on Shotstack rich-caption (animation styles pop | fade | karaoke; active word colours).
  const captionVariants: Record<CaptionStyle, Record<string, unknown>> = {
    bold: {
      font: { family, size: 62, color: light, opacity: 1, weight: 900 },
      style: { textTransform: "uppercase" },
      stroke: { width: 7, color: ink, opacity: 1 },
      animation: { style: "pop" },
      active: { font: { color: light, background: accent }, stroke: { width: 7, color: ink, opacity: 1 } },
    },
    clean: {
      font: { family, size: 46, color: light, opacity: 1, weight: 700 },
      style: { textTransform: "none" },
      stroke: { width: 4, color: ink, opacity: 1 },
      animation: { style: "fade" },
      active: { font: { color: accent } },
    },
    karaoke: {
      font: { family, size: 54, color: light, opacity: 1, weight: 800 },
      style: { textTransform: "none" },
      stroke: { width: 6, color: ink, opacity: 1 },
      animation: { style: "karaoke" },
      active: { font: { color: accent } },
    },
  };
  const captionStyle = {
    type: "rich-caption",
    ...captionVariants[captionLook],
    border: { width: 0, color: ink, opacity: 1, radius: 16 },
    padding: { top: 6, right: 10, bottom: 6, left: 10 },
    align: { vertical: "middle" },
  };

  // Base: the presenter for the full length (repeated copies only in fill mode, for sandbox tests).
  const copies = fill ? Math.ceil(total / presenterLen) : 1;
  const presenterClips = Array.from({ length: copies }, (_, i) => {
    const start = Math.round(i * presenterLen * 10) / 10;
    const length = Math.min(presenterLen, Math.round((total - start) * 10) / 10);
    return { alias: i === 0 ? "presenter" : `presenter${i + 1}`, asset: { type: "video", src: input.presenterUrl, volume: 1, trim: 0 }, start, length, fit: "crop" };
  });
  const captions = {
    clips: presenterClips.map((c) => ({
      asset: { ...captionStyle, src: `alias://${c.alias}` },
      start: c.start,
      length: c.length,
      width: 900,
      height: 500,
      offset: { x: 0, y: -0.18 },
    })),
  };

  // Product footage over the presenter at the moments from adLayout(). RULE: no text on screen except
  // the captions, so there is no hook card, no benefit labels and no end card (CLAUDE.md, 2026-10-19).
  // Each overlay has its own camera move and crop (scale + offset), soft 0.5 s transitions in and out
  // (Shotstack "Fast" variants), volume 0 (MiniMax clips carry a sound track) and opacity 1 so the
  // presenter never shows through; the presenter track below keeps playing, so voice and captions are
  // continuous. fit "crop": a 720×1280 clip is scaled up to fill 1080×1920.
  const productOverlays = {
    clips: layout.overlays.map((o) => {
      const usePhoto = o.usePhoto && Boolean(input.productPhotoUrl);
      const asset = usePhoto ? { type: "image", src: input.productPhotoUrl } : { type: "video", src: input.productClipUrl, volume: 0, trim: o.trim };
      return {
        asset,
        start: o.start,
        length: o.length,
        fit: "crop",
        scale: o.motion.scale,
        offset: { x: 0, y: o.motion.offsetY },
        opacity: 1,
        effect: o.motion.effect,
        transition: { in: o.motion.transitionIn, out: o.motion.transitionOut },
      };
    }),
  };

  // Logo: small, top-right, the whole ad (Shotstack positioning docs: scale + position + offset).
  const logo = input.brand?.logoUrl
    ? { clips: [{ asset: { type: "image", src: input.brand.logoUrl }, start: 0, length: total, fit: "contain", scale: 0.14, position: "topRight", offset: { x: -0.04, y: -0.03 }, opacity: 0.95 }] }
    : null;
  const presenter = { clips: presenterClips };

  return {
    timeline: {
      background: ink,
      tracks: [...(logo ? [logo] : []), captions, productOverlays, presenter],
    },
    output: { format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 },
    meta: { totalSeconds: total, layout, filled: Boolean(fill) },
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
  /** Keep the source format: output exactly this size (max 1920 per side) instead of 1080×1920. */
  size?: { width: number; height: number };
  colors?: { accent?: string; ink?: string; light?: string };
  /** Seconds cut from the start (silence before the first line); the SRT must already be shifted by the same amount. */
  trimStart?: number;
  /** Seconds cut from the end (silence after the last line). */
  trimEnd?: number;
  /** "low" = above the bottom 15% of the frame (default); "middle" = centre. */
  captionPosition?: "low" | "middle";
  /** The customer's caption choices (26 Oct 2026); missing = the original look (box, red, medium, capitals). */
  captionStyle?: Partial<CaptionStyleChoice>;
};

/** The words' own colour and outline: dark text gets a light outline (26 Oct 2026). */
function captionText(look: CaptionStyleChoice, light: string, ink: string) {
  const text = look.textColor ?? light;
  return { text, stroke: { width: 7, color: isLightColor(text) ? ink : light, opacity: 1 } };
}

/** The active-word styling per highlight choice (Shotstack RichCaptionActive, checked 26 Oct 2026). */
function activeWord(highlight: CaptionHighlight, color: string, light: string, ink: string, look?: CaptionStyleChoice) {
  const { text, stroke } = captionText(look ?? DEFAULT_TRANSLATE_LOOK, light, ink);
  switch (highlight) {
    case "box":
      // Text inside a light box (yellow, white) turns dark so it stays readable.
      return isLightColor(color) ? { font: { color: ink, background: color }, stroke: "none" as const } : { font: { color: text, background: color }, stroke };
    case "color":
      return { font: { color }, stroke: { ...stroke, color: isLightColor(color) ? ink : light } };
    case "underline":
      return { font: { color, textDecoration: "underline" }, stroke: { ...stroke, color: isLightColor(color) ? ink : light } };
    case "none":
      return undefined;
  }
}

/** One video track plus TikTok-style captions, output 1080×1920. Same caption style as the ad. */
export function buildCaptionEdit(input: CaptionEditInput) {
  const accent = input.colors?.accent ?? "#D43F1B";
  const ink = input.colors?.ink ?? "#111114";
  const light = input.colors?.light ?? "#FFFFFF";
  const trimStart = Math.max(0, Math.round((input.trimStart ?? 0) * 10) / 10);
  const trimEnd = Math.max(0, Math.round((input.trimEnd ?? 0) * 10) / 10);
  const total = Math.max(1, Math.round((input.seconds - trimStart - trimEnd) * 10) / 10);
  const look = captionStyleOf({ color: accent as CaptionStyleChoice["color"], ...input.captionStyle });
  const active = activeWord(look.highlight, look.color, light, ink, look);
  const words = captionText(look, light, ink);

  const captions = {
    clips: [
      {
        asset: {
          type: "rich-caption",
          src: input.srtUrl ?? "alias://source",
          font: { family: "Roboto", size: CAPTION_SIZE_PX[look.size], color: words.text, opacity: 1, weight: 900 },
          style: { textTransform: look.uppercase ? "uppercase" : "none" },
          stroke: words.stroke,
          animation: { style: "pop" },
          ...(active ? { active } : {}),
          border: { width: 0, color: ink, opacity: 1, radius: 16 },
          padding: { top: 6, right: 10, bottom: 6, left: 10 },
          align: { vertical: "middle" },
        },
        start: 0,
        length: total,
        width: 900,
        height: 500,
        // "low": the caption box sits roughly between 18% and 32% from the bottom, clear of the bottom 15%.
        offset: { x: 0, y: input.captionPosition === "middle" ? 0 : -0.18 },
      },
    ],
  };

  const video = {
    clips: [
      {
        alias: "source",
        // Leading silence is cut with trim; trailing silence by the shorter clip length.
        asset: { type: "video", src: input.videoUrl, volume: 1, trim: trimStart },
        start: 0,
        length: total,
        fit: input.fit ?? "crop",
      },
    ],
  };

  const output = input.size
    ? { format: "mp4", size: fitSize(input.size), fps: 25 }
    : { format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 };
  return {
    // Captions off: only the video track (still cropped or resized, silence still trimmed).
    timeline: { background: ink, tracks: look.show ? [captions, video] : [video] },
    output,
    meta: { totalSeconds: total, trimStart, trimEnd },
  };
}

export type PresenterTranslateEditInput = {
  presenterUrl: string;
  /** Length of the presenter video: the length of the result. */
  presenterSeconds: number;
  layout: "presenter" | "overlay";
  /** "overlay": the customer's video (cleaned when chosen), muted behind the presenter, repeated to fill. */
  sourceUrl?: string;
  sourceSeconds?: number;
  captionPosition?: "low" | "middle";
  captionStyle?: Partial<CaptionStyleChoice>;
};

/**
 * "Translate with an AI presenter" (26 Oct 2026): the presenter speaks the translation; captions are
 * transcribed from the presenter's own audio (alias), so they match the new timing. "overlay" puts the
 * presenter in a box at the top right over the customer's muted video; output 1080×1920.
 */
export function buildPresenterTranslateEdit(input: PresenterTranslateEditInput) {
  const ink = "#111114";
  const light = "#FFFFFF";
  const total = Math.max(1, Math.round(input.presenterSeconds * 10) / 10);
  const look = captionStyleOf(input.captionStyle);
  const active = activeWord(look.highlight, look.color, light, ink, look);
  const words = captionText(look, light, ink);
  const captions = {
    clips: [
      {
        asset: {
          type: "rich-caption",
          src: "alias://presenter",
          font: { family: "Roboto", size: CAPTION_SIZE_PX[look.size], color: words.text, opacity: 1, weight: 900 },
          style: { textTransform: look.uppercase ? "uppercase" : "none" },
          stroke: words.stroke,
          animation: { style: "pop" },
          ...(active ? { active } : {}),
          padding: { top: 6, right: 10, bottom: 6, left: 10 },
          align: { vertical: "middle" },
        },
        start: 0,
        length: total,
        width: 900,
        height: 500,
        offset: { x: 0, y: input.captionPosition === "middle" ? 0 : -0.18 },
      },
    ],
  };
  const overlay = input.layout === "overlay" && input.sourceUrl;
  const presenter = {
    clips: [
      {
        alias: "presenter",
        asset: { type: "video", src: input.presenterUrl, volume: 1 },
        start: 0,
        length: total,
        fit: "crop",
        ...(overlay ? { scale: 0.38, position: "topRight", offset: { x: -0.03, y: -0.025 } } : {}),
      },
    ],
  };
  const tracks: Record<string, unknown>[] = look.show ? [captions, presenter] : [presenter];
  if (overlay) {
    // The customer's video, muted, repeated until the presenter has finished.
    const length = Math.max(1, input.sourceSeconds ?? total);
    const clips: Record<string, unknown>[] = [];
    for (let start = 0; start < total; start += length) {
      clips.push({ asset: { type: "video", src: input.sourceUrl, volume: 0 }, start: Math.round(start * 10) / 10, length: Math.round(Math.min(length, total - start) * 10) / 10, fit: "crop" });
    }
    tracks.push({ clips });
  }
  return {
    timeline: { background: ink, tracks },
    output: { format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 },
    meta: { totalSeconds: total },
  };
}

/**
 * Text removal returns the picture without sound (26 Oct 2026: the cleaned file had no audio track,
 * so the translation refused it). This puts the original sound under the cleaned picture: the cleaned
 * video on top (muted), the original below it (sound only, fully covered), at the source's size.
 */
export function buildRemuxEdit(input: { pictureUrl: string; soundUrl: string; seconds: number; size?: { width: number; height: number } }) {
  const total = Math.max(1, Math.round(input.seconds * 10) / 10);
  return {
    timeline: {
      background: "#000000",
      tracks: [
        { clips: [{ asset: { type: "video", src: input.pictureUrl, volume: 0 }, start: 0, length: total, fit: "crop" }] },
        { clips: [{ asset: { type: "video", src: input.soundUrl, volume: 1 }, start: 0, length: total, fit: "crop" }] },
      ],
    },
    output: input.size ? { format: "mp4", size: fitSize(input.size), fps: 25 } : { format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 },
    meta: { totalSeconds: total },
  };
}

/** Shotstack renders at most 1920 px per side and wants even numbers. */
function fitSize(size: { width: number; height: number }) {
  const scale = Math.min(1, 1920 / Math.max(size.width, size.height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(size.width), height: even(size.height) };
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
