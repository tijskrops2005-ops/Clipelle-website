import { CAPTION_SIZE_PX, captionStyleOf, DEFAULT_CAPTION_STYLE, type CaptionStyleChoice } from "@/lib/captionOptions";

/**
 * The edit screen's recipe (2 Nov 2026): what the customer changed on a finished video, as data. The
 * screen previews it with HTML and CSS; "Export" stores it on a new version and the render step turns
 * it into one edit job (`buildEditFromRecipe`). Times are seconds of the source video; the output
 * counts only what is kept (`toOutputTime`). Pure and browser-safe, tested in editRecipe.test.ts.
 */
export const RECIPE_VERSION = 1 as const;

export type Range = { start: number; end: number };
export type RecipeCue = { index: number; start: number; end: number; text: string };

export type OverlayPosition = "top" | "bottom";

export type EditRecipe = {
  v: typeof RECIPE_VERSION;
  /** Length of the source in seconds; the trim and cuts stay inside it. */
  sourceSeconds: number;
  /** The window that is kept, in source seconds. */
  trim: Range;
  /** Pieces inside the window that are removed, in source seconds. */
  cuts: Range[];
  /** Captions (translations only): the lines as the customer left them, a style and a position. Off = no captions on the export. */
  captions?: { enabled: boolean; cues: RecipeCue[]; style: CaptionStyleChoice; position: "low" | "middle" };
  /** A name or a line at the top or bottom of the picture for part of the video (source seconds). */
  lowerThird?: { enabled: boolean; text: string; from: number; to: number; position: OverlayPosition };
  /** A short call to action near the end (source seconds). */
  cta?: { enabled: boolean; text: string; from: number; to: number };
  /** The brand logo from Settings → Brand, top right, for the whole video. */
  logo?: { enabled: boolean };
};

export const OVERLAY_MAX_CHARS = 60;
/** The smallest piece that is kept or cut: anything shorter is noise from a handle. */
export const MIN_PIECE_SECONDS = 0.5;

export const CAPTION_PRESETS: { key: string; label: string; style: CaptionStyleChoice }[] = [
  { key: "bold", label: "Bold box", style: { ...DEFAULT_CAPTION_STYLE } },
  { key: "clean", label: "Clean", style: { ...DEFAULT_CAPTION_STYLE, highlight: "none", uppercase: false, size: "medium" } },
  { key: "yellow", label: "Yellow word", style: { ...DEFAULT_CAPTION_STYLE, highlight: "color", color: "#FFD400" } },
  { key: "underline", label: "Underline", style: { ...DEFAULT_CAPTION_STYLE, highlight: "underline", color: "#FFFFFF", uppercase: false } },
  { key: "big", label: "Big", style: { ...DEFAULT_CAPTION_STYLE, size: "large" } },
];

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A fresh recipe: the whole video, nothing cut, captions as they were rendered (when there are lines). */
export function defaultRecipe(sourceSeconds: number, captions?: { cues: RecipeCue[]; style?: Partial<CaptionStyleChoice> | null; position?: "low" | "middle" }): EditRecipe {
  const seconds = Math.max(1, r1(sourceSeconds));
  return {
    v: RECIPE_VERSION,
    sourceSeconds: seconds,
    trim: { start: 0, end: seconds },
    cuts: [],
    ...(captions ? { captions: { enabled: captionStyleOf(captions.style).show, cues: captions.cues.map((c) => ({ ...c, text: c.text })), style: captionStyleOf(captions.style), position: captions.position ?? "low" } } : {}),
    lowerThird: { enabled: false, text: "", from: 0, to: Math.min(seconds, 5), position: "bottom" },
    cta: { enabled: false, text: "", from: Math.max(0, seconds - 4), to: seconds },
    logo: { enabled: false },
  };
}

/** The pieces of the source that stay, in order, after the trim and the cuts; tiny leftovers are dropped. */
export function keptRanges(recipe: Pick<EditRecipe, "sourceSeconds" | "trim" | "cuts">): Range[] {
  const start = clamp(r1(recipe.trim.start), 0, recipe.sourceSeconds);
  const end = clamp(r1(recipe.trim.end), start, recipe.sourceSeconds);
  const cuts = recipe.cuts
    .map((c) => ({ start: clamp(r1(c.start), start, end), end: clamp(r1(c.end), start, end) }))
    .filter((c) => c.end - c.start >= MIN_PIECE_SECONDS)
    .sort((a, b) => a.start - b.start);
  const out: Range[] = [];
  let cursor = start;
  for (const cut of cuts) {
    if (cut.start > cursor) out.push({ start: cursor, end: cut.start });
    cursor = Math.max(cursor, cut.end);
  }
  if (end > cursor) out.push({ start: cursor, end });
  return out.filter((r) => r.end - r.start >= MIN_PIECE_SECONDS).map((r) => ({ start: r1(r.start), end: r1(r.end) }));
}

export function outputSeconds(recipe: Pick<EditRecipe, "sourceSeconds" | "trim" | "cuts">) {
  return r1(keptRanges(recipe).reduce((sum, r) => sum + (r.end - r.start), 0));
}

/** A moment of the source on the output's clock; null when that moment was cut. */
export function toOutputTime(t: number, recipe: Pick<EditRecipe, "sourceSeconds" | "trim" | "cuts">): number | null {
  let offset = 0;
  for (const r of keptRanges(recipe)) {
    if (t >= r.start && t <= r.end) return r1(offset + (t - r.start));
    if (t < r.start) return null;
    offset += r.end - r.start;
  }
  return null;
}

/** A moment of the output on the source's clock (the preview seeks with this). */
export function fromOutputTime(t: number, recipe: Pick<EditRecipe, "sourceSeconds" | "trim" | "cuts">): number {
  let offset = 0;
  const ranges = keptRanges(recipe);
  for (const r of ranges) {
    const len = r.end - r.start;
    if (t <= offset + len) return r1(r.start + (t - offset));
    offset += len;
  }
  return ranges.length ? ranges[ranges.length - 1].end : 0;
}

/** Is this source moment on screen in the output? */
export function isKept(t: number, recipe: Pick<EditRecipe, "sourceSeconds" | "trim" | "cuts">) {
  return keptRanges(recipe).some((r) => t >= r.start && t < r.end);
}

/**
 * The caption lines on the output's clock: a line that crosses a cut is clipped to what is kept
 * (a line that lies entirely in a cut disappears). Empty lines are dropped.
 */
export function recipeCues(recipe: EditRecipe): RecipeCue[] {
  if (!recipe.captions?.enabled) return [];
  const ranges = keptRanges(recipe);
  const out: RecipeCue[] = [];
  for (const cue of recipe.captions.cues) {
    const text = cue.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    let offset = 0;
    for (const r of ranges) {
      const s = Math.max(cue.start, r.start);
      const e = Math.min(cue.end, r.end);
      if (e - s >= 0.2) out.push({ index: out.length + 1, start: r1(offset + (s - r.start)), end: r1(offset + (e - r.start)), text });
      offset += r.end - r.start;
    }
  }
  return out.sort((a, b) => a.start - b.start).map((c, i) => ({ ...c, index: i + 1 }));
}

/** A text overlay's time on the output's clock, clipped to what is kept; null when nothing of it remains. */
export function overlayWindow(from: number, to: number, recipe: Pick<EditRecipe, "sourceSeconds" | "trim" | "cuts">): Range | null {
  const ranges = keptRanges(recipe);
  let offset = 0;
  let start: number | null = null;
  let end: number | null = null;
  for (const r of ranges) {
    const s = Math.max(from, r.start);
    const e = Math.min(to, r.end);
    if (e - s > 0.05) {
      const os = offset + (s - r.start);
      const oe = offset + (e - r.start);
      start = start === null ? os : start;
      end = oe;
    }
    offset += r.end - r.start;
  }
  return start !== null && end !== null && end - start >= 0.2 ? { start: r1(start), end: r1(end) } : null;
}

/** Credits for an export (2 Nov 2026): one per six seconds of finished video, at least two. */
export const EXPORT_CREDITS_PER_SECOND = 1 / 6;
export const EXPORT_MIN_CREDITS = 2;
export function exportCredits(seconds: number) {
  return Math.max(EXPORT_MIN_CREDITS, Math.ceil(Math.max(0, seconds) * EXPORT_CREDITS_PER_SECOND));
}

/** What changed, in a few words, for the version's name and the summary line. */
export function recipeSummary(recipe: EditRecipe): string[] {
  const parts: string[] = [];
  const kept = outputSeconds(recipe);
  if (recipe.trim.start > 0 || recipe.trim.end < recipe.sourceSeconds) parts.push("trimmed");
  // Every cut that takes a real piece out of the kept window counts, also one at its very start or end.
  const lo = Math.max(0, recipe.trim.start);
  const hi = Math.min(recipe.sourceSeconds, recipe.trim.end);
  const cuts = recipe.cuts.filter((c) => Math.min(c.end, hi) - Math.max(c.start, lo) >= MIN_PIECE_SECONDS).length;
  if (cuts > 0) parts.push(`${cuts} ${cuts === 1 ? "cut" : "cuts"}`);
  if (recipe.captions && !recipe.captions.enabled) parts.push("captions off");
  if (recipe.lowerThird?.enabled && recipe.lowerThird.text.trim()) parts.push("text");
  if (recipe.cta?.enabled && recipe.cta.text.trim()) parts.push("call to action");
  if (recipe.logo?.enabled) parts.push("logo");
  if (parts.length === 0) parts.push(`${kept} s`);
  return parts;
}

/* ---------- the render job ---------- */

export type RecipeEditInput = {
  videoUrl: string;
  /** SRT of `recipeCues` on the output's clock, already stored and reachable; absent = no captions. */
  srtUrl?: string;
  /** The output size; absent = 1080×1920. */
  size?: { width: number; height: number };
  /** The brand logo, reachable by the render service; absent = no logo even when the recipe asks for one. */
  logoUrl?: string;
  colors?: { accent?: string; ink?: string; light?: string };
};

export type RecipeEdit = { timeline: Record<string, unknown>; output: Record<string, unknown>; meta: { totalSeconds: number; pieces: number } };

/**
 * One render job from a recipe: a video clip per kept piece (cut together without transitions),
 * captions from the SRT in the chosen style, a bar of text at the top or bottom, a call to action
 * near the end, and the logo top right. Same frame rules as the caption render (src/lib/services/finalEdit.ts).
 */
export function buildEditFromRecipe(recipe: EditRecipe, input: RecipeEditInput): RecipeEdit {
  const ink = input.colors?.ink ?? "#111114";
  const light = input.colors?.light ?? "#FFFFFF";
  const frame = input.size ? fitSize(input.size) : { width: 1080, height: 1920 };
  const ranges = keptRanges(recipe);
  const total = Math.max(1, outputSeconds(recipe));
  let at = 0;
  const videoClips = ranges.map((r) => {
    const length = r1(r.end - r.start);
    const clip = { asset: { type: "video", src: input.videoUrl, volume: 1, trim: r.start }, start: r1(at), length, fit: "crop" };
    at += length;
    return clip;
  });
  const tracks: Record<string, unknown>[] = [];

  // Logo top right, over everything, the whole video.
  if (recipe.logo?.enabled && input.logoUrl) {
    tracks.push({ clips: [{ asset: { type: "image", src: input.logoUrl }, start: 0, length: total, fit: "contain", scale: 0.16, position: "topRight", offset: { x: -0.04, y: -0.05 } }] });
  }
  // Call to action: a pill near the bottom, over the captions.
  const cta = recipe.cta?.enabled && recipe.cta.text.trim() ? overlayWindow(recipe.cta.from, recipe.cta.to, recipe) : null;
  if (cta && recipe.cta) {
    tracks.push({ clips: [textClip(recipe.cta.text.trim(), cta, { frame, y: -0.36, font: Math.round(frame.width * 0.046), color: light, background: input.colors?.accent ?? "#D43F1B", weight: 700 })] });
  }
  // Captions in the chosen style, on the output's clock.
  if (recipe.captions?.enabled && input.srtUrl) {
    tracks.push({ clips: [captionClip(recipe.captions.style, recipe.captions.position, input.srtUrl, total, frame, ink, light, input.colors?.accent)] });
  }
  // Lower third: a line of text in a soft dark bar at the top or the bottom.
  const lt = recipe.lowerThird?.enabled && recipe.lowerThird.text.trim() ? overlayWindow(recipe.lowerThird.from, recipe.lowerThird.to, recipe) : null;
  if (lt && recipe.lowerThird) {
    tracks.push({ clips: [textClip(recipe.lowerThird.text.trim(), lt, { frame, y: recipe.lowerThird.position === "top" ? 0.36 : -0.26, font: Math.round(frame.width * 0.042), color: light, background: ink, opacity: 0.78, weight: 600 })] });
  }
  tracks.push({ clips: videoClips });

  const output = input.size ? { format: "mp4", size: frame, fps: 25 } : { format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 };
  return { timeline: { background: ink, tracks }, output, meta: { totalSeconds: total, pieces: ranges.length } };
}

function textClip(text: string, window: Range, o: { frame: { width: number; height: number }; y: number; font: number; color: string; background: string; opacity?: number; weight: number }) {
  return {
    asset: {
      type: "rich-text",
      text,
      font: { family: "Roboto", size: o.font, color: o.color, weight: o.weight },
      align: { horizontal: "center", vertical: "middle" },
      background: { color: o.background, opacity: o.opacity ?? 1, borderRadius: 18, wrap: true, padding: 16 },
      animation: { preset: "fadeIn", duration: 0.4 },
    },
    start: window.start,
    length: r1(Math.max(0.2, window.end - window.start)),
    width: Math.round(o.frame.width * 0.86),
    height: Math.round(o.font * 2.6),
    offset: { x: 0, y: o.y },
  };
}

function captionClip(style: CaptionStyleChoice, position: "low" | "middle", srtUrl: string, total: number, frame: { width: number; height: number }, ink: string, light: string, accent?: string) {
  const look = captionStyleOf(style);
  const fontPx = CAPTION_SIZE_PX[look.size];
  const text = look.textColor ?? light;
  const stroke = { width: 8, color: ink, opacity: 1 };
  const color = look.color ?? accent ?? "#D43F1B";
  const active =
    look.highlight === "box" ? { font: { color: text, background: color }, stroke } : look.highlight === "color" ? { font: { color }, stroke } : look.highlight === "underline" ? { font: { color, textDecoration: "underline" }, stroke } : undefined;
  return {
    asset: {
      type: "rich-caption",
      src: srtUrl,
      font: { family: "Roboto", size: fontPx, color: text, opacity: 1, weight: 900 },
      style: { textTransform: look.uppercase ? "uppercase" : "none" },
      stroke,
      animation: { style: "pop" },
      ...(active ? { active } : {}),
      border: { width: 0, color: ink, opacity: 1, radius: 16 },
      padding: { top: 6, right: 10, bottom: 6, left: 10 },
      align: { horizontal: "center", vertical: "middle" },
    },
    start: 0,
    length: total,
    width: Math.round(frame.width * 0.833),
    height: Math.round(fontPx * 2 * 1.25 + 12),
    offset: { x: 0, y: position === "middle" ? 0 : -0.18 },
  };
}

/** The render service takes at most 1920 px per side and even numbers (same rule as finalEdit.ts). */
function fitSize(size: { width: number; height: number }) {
  const scale = Math.min(1, 1920 / Math.max(size.width, size.height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(size.width), height: even(size.height) };
}
