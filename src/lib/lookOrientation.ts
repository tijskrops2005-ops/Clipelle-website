/**
 * Orientation of a HeyGen look (browser-safe, pure). HeyGen returns `preferred_orientation`
 * and the native `image_width`/`image_height` of a look; a landscape look rendered in 9:16
 * comes back letterboxed (720×406 picture in a 720×1280 frame, measured 2026-10-19), so the
 * ad workflow only accepts portrait looks.
 */
export type LookOrientation = "portrait" | "landscape" | "square" | "unknown";

export type LookDims = { preferred_orientation?: string | null; image_width?: number | null; image_height?: number | null };

export function lookOrientation(look: LookDims): LookOrientation {
  const p = look.preferred_orientation?.toLowerCase();
  if (p === "portrait" || p === "landscape" || p === "square") return p;
  const w = look.image_width ?? 0;
  const h = look.image_height ?? 0;
  if (w > 0 && h > 0) return h > w * 1.05 ? "portrait" : w > h * 1.05 ? "landscape" : "square";
  return "unknown";
}

/** Only portrait looks fill a 9:16 frame without bars or a blurry centre crop. */
export function isPortraitLook(look: LookDims) {
  return lookOrientation(look) === "portrait";
}
