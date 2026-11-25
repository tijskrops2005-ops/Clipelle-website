/**
 * The enhancer's rules (25 Nov 2026), pure and browser-safe: what a job costs in credits and in
 * provider money, which factor goes to the enhancer, and how long a video may be within the cost
 * guard's limit per action. The provider is Topaz on fal.ai (docs/vendors/fal/capabilities.md):
 *   - video `fal-ai/topaz/upscale/video`: $0.01/s up to 720p, $0.02/s up to 1080p, $0.08/s above;
 *     double for 60 fps output.
 *   - image `fal-ai/topaz/upscale/image`: $0.08 per image up to 24 MP output.
 * Credits keep MIN_MARGIN on the cheapest credit of every plan (tested in enhanceRules.test.ts).
 */
export type EnhanceKind = "video" | "image";
export type VideoTarget = "1080p" | "4k";
export type ImageTarget = "2x" | "4x";
export type EnhanceTarget = VideoTarget | ImageTarget;

export const VIDEO_TARGETS: { key: VideoTarget; label: string; text: string; short: number }[] = [
  { key: "1080p", label: "1080p", text: "Full HD. Sharper and cleaner; the size most platforms show.", short: 1080 },
  { key: "4k", label: "4K", text: "Four times the pixels of Full HD, for big screens and crops.", short: 2160 },
];
export const IMAGE_TARGETS: { key: ImageTarget; label: string; text: string; factor: number }[] = [
  { key: "2x", label: "2×", text: "Twice the width and height.", factor: 2 },
  { key: "4x", label: "4×", text: "Four times the width and height (up to 24 megapixels).", factor: 4 },
];

export const ENHANCE_CREDITS = {
  /** Per second of video at up to 1080p, and above it. */
  videoPerSecond: { "1080p": 1, "4k": 4 } as Record<VideoTarget, number>,
  videoMinimum: 10,
  /** A source above 30 fps doubles the provider price, so it doubles the credits. */
  highFpsMultiplier: 2,
  image: 5,
} as const;

export const ENHANCE_USD = { upTo720: 0.01, upTo1080: 0.02, above1080: 0.08, image: 0.08 } as const;

/** Output above this many pixels costs more per image; we stay at or below it. */
export const IMAGE_MAX_OUTPUT_PIXELS = 24_000_000;
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
/** Longest video the enhancer takes at all (same as a translation upload); the cost limit may be lower. */
export const VIDEO_MAX_SECONDS = 180;

const round2 = (n: number) => Math.round(n * 100) / 100;
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
export const isHighFps = (fps?: number | null) => typeof fps === "number" && fps > 31;

/** The factor that brings the short side to the target (never below 1, never above 8, the enhancer's limit). */
export function videoFactor(width: number, height: number, target: VideoTarget) {
  const short = Math.max(1, Math.min(width, height));
  const goal = VIDEO_TARGETS.find((t) => t.key === target)!.short;
  return Math.round(Math.min(8, Math.max(1, goal / short)) * 1000) / 1000;
}

export function videoOutput(width: number, height: number, target: VideoTarget) {
  const f = videoFactor(width, height, target);
  return { factor: f, width: even(width * f), height: even(height * f) };
}

/** The provider price tier follows the output's short side. */
export function videoUsdPerSecond(outShort: number, fps?: number | null) {
  const base = outShort <= 720 ? ENHANCE_USD.upTo720 : outShort <= 1080 ? ENHANCE_USD.upTo1080 : ENHANCE_USD.above1080;
  return base * (isHighFps(fps) ? 2 : 1);
}

export function videoCredits(seconds: number, target: VideoTarget, fps?: number | null) {
  const s = Math.max(1, Math.round(seconds));
  const perSecond = ENHANCE_CREDITS.videoPerSecond[target] * (isHighFps(fps) ? ENHANCE_CREDITS.highFpsMultiplier : 1);
  return Math.max(ENHANCE_CREDITS.videoMinimum * ENHANCE_CREDITS.videoPerSecond[target], s * perSecond);
}

export function videoEstimateUsd(seconds: number, width: number, height: number, target: VideoTarget, fps?: number | null) {
  const out = videoOutput(width, height, target);
  return round2(Math.max(1, Math.round(seconds)) * videoUsdPerSecond(Math.min(out.width, out.height), fps));
}

/**
 * The longest video one job may be within the cost limit per action: the worst case (above 1080p for
 * 4K, 1080p otherwise; 60 fps when `highFps`), never above VIDEO_MAX_SECONDS.
 */
export function maxVideoSeconds(maxUsdPerAction: number, target: VideoTarget, highFps = false) {
  const perSecond = (target === "4k" ? ENHANCE_USD.above1080 : ENHANCE_USD.upTo1080) * (highFps ? 2 : 1);
  return Math.max(0, Math.min(VIDEO_MAX_SECONDS, Math.floor(maxUsdPerAction / perSecond)));
}

/** The factor an image gets: the chosen one, lowered so the result stays at or below 24 megapixels. */
export function imageOutput(width: number, height: number, target: ImageTarget) {
  const wanted = IMAGE_TARGETS.find((t) => t.key === target)!.factor;
  const cap = Math.sqrt(IMAGE_MAX_OUTPUT_PIXELS / Math.max(1, width * height));
  const factor = Math.round(Math.max(1, Math.min(wanted, cap)) * 1000) / 1000;
  return { factor, width: Math.floor(width * factor), height: Math.floor(height * factor), capped: factor < wanted };
}

export const imageCredits = () => ENHANCE_CREDITS.image;

/**
 * Width and height from the first bytes of a PNG, JPEG or WebP (no library): enough to check the size
 * before anything is charged. Null when the bytes are none of those or the header is cut off.
 */
export function imageSize(bytes: Uint8Array): { width: number; height: number; type: "png" | "jpeg" | "webp" } | null {
  const b = bytes;
  const u16 = (i: number) => (b[i] << 8) | b[i + 1];
  const u32 = (i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  const le16 = (i: number) => b[i] | (b[i + 1] << 8);
  const le24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: u32(16), height: u32(20), type: "png" };
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = u16(i + 2);
      // Start-of-frame markers carry the size (not DHT c4, JPG c8, DAC cc).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: u16(i + 5), width: u16(i + 7), type: "jpeg" };
      }
      i += 2 + len;
    }
    return null;
  }
  if (b.length >= 30 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8X") return { width: le24(24) + 1, height: le24(27) + 1, type: "webp" };
    if (chunk === "VP8 ") return { width: le16(26) & 0x3fff, height: le16(28) & 0x3fff, type: "webp" };
    if (chunk === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, type: "webp" };
    }
  }
  return null;
}
