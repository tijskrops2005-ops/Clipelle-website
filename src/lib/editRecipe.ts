import { barMeta, CAPTION_SIZE_PX, captionFontOf, captionStyleOf, DEFAULT_CAPTION_STYLE, effectiveBar, readableOn, timelineFontsFor, type CaptionStyleChoice } from "@/lib/captionOptions";
import { fitCaptionToCover, type CaptionFit, type CoverBox } from "@/lib/captionFit";
import { fillGaps } from "@/lib/captionChunks";
import { isMoving, segmentForCue, type CoverSegment } from "@/lib/captionTrack";

/**
 * The edit screen's recipe (2 Nov 2026): what the customer changed on a finished video, as data. The
 * screen previews it with HTML and CSS; "Export" stores it on a new version and the render step turns
 * it into one edit job (`buildEditFromRecipe`). Times are seconds of the source video; the output
 * counts only what is kept (`toOutputTime`). Pure and browser-safe, tested in editRecipe.test.ts.
 */
export const RECIPE_VERSION = 1 as const;

export type Range = { start: number; end: number };
/**
 * Where a caption line sits (26 Nov 2026, Tijs: captions that move with the old text, or that the
 * customer moves over it): "auto" follows the old text's spot (over removed text) or the chosen
 * position; "top", "middle" and "low" put the line there.
 */
export const CAPTION_PLACES = ["auto", "top", "middle", "low"] as const;
export type CaptionPlace = (typeof CAPTION_PLACES)[number];
export const PLACE_LABEL: Record<CaptionPlace, string> = { auto: "Auto", top: "Top", middle: "Middle", low: "Low" };
/** Offset from the centre (a fraction of the frame height, positive = up) per fixed place. */
export const PLACE_OFFSET: Record<Exclude<CaptionPlace, "auto">, number> = { top: 0.3, middle: 0, low: -0.18 };

export type RecipeCue = { index: number; start: number; end: number; text: string; place?: CaptionPlace };

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
  /** Background music under the voice (26 Nov 2026, Tijs): a track from our library or the customer's own file. */
  music?: RecipeMusic;
};

export type RecipeMusic = {
  enabled: boolean;
  source: "library" | "upload";
  /** Library: the track key (src/content/musicLibrary.ts). */
  track?: string;
  /** Upload: the stored file of the customer, and its name for the screen. */
  path?: string;
  name?: string;
  /** 0–MUSIC_MAX_VOLUME; the voice stays at full volume. */
  volume: number;
};
/** Music never louder than this under the voice (the render's volume runs 0–1). */
export const MUSIC_MAX_VOLUME = 0.6;
export const MUSIC_DEFAULT_VOLUME = 0.18;

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

export type Piece = { start: number; end: number; state: "kept" | "cut" | "out" };

/** The parts of the source between every boundary: the trim, the cuts and the customer's splits (26 Nov 2026, the timeline's Split / Delete part). */
export function timelinePieces(recipe: EditRecipe, splits: number[]): Piece[] {
  const total = recipe.sourceSeconds;
  const points = new Set<number>([0, total, recipe.trim.start, recipe.trim.end, ...recipe.cuts.flatMap((c) => [c.start, c.end]), ...splits]);
  const sorted = [...points].map((p) => Math.round(Math.min(total, Math.max(0, p)) * 10) / 10).filter((p, i, a) => a.indexOf(p) === i).sort((a, b) => a - b);
  const pieces: Piece[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end - start < 0.05) continue;
    const mid = (start + end) / 2;
    const state = mid < recipe.trim.start || mid > recipe.trim.end ? "out" : recipe.cuts.some((c) => mid > c.start && mid < c.end) ? "cut" : "kept";
    pieces.push({ start, end, state });
  }
  return pieces;
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
  if (recipe.music?.enabled && (recipe.music.track || recipe.music.path)) parts.push("music");
  if (recipe.captions?.cues.some((c) => c.place && c.place !== "auto")) parts.push("captions moved");
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
  /**
   * Where on-screen text was removed from the source (24 Nov 2026): the captions then sit on one fixed,
   * opaque box over that spot for the whole video, as in the caption render, so leftover letters never show.
   */
  coverBox?: CoverBox;
  /** Old text that moved, on the edited video's clock (`coverTrackFor`). */
  coverTrack?: CoverSegment[];
  /** One SRT per caption place (`exportLayers`), when `needsLayers`; replaces `srtUrl`. */
  layers?: { key: string; srtUrl: string }[];
  /** Background music, reachable by the render service, with its length when known (it repeats to fill). */
  music?: { url: string; seconds?: number; volume: number };
};

/**
 * The caption lines an export renders, on the output's clock (24 Nov 2026). Over removed text the
 * captions stay on (they are what covers the cleaned spot) and run on from line to line, from the
 * first frame to the last, as in the caption render.
 */
export function exportCues(recipe: EditRecipe, covered: boolean): RecipeCue[] {
  if (!covered) return recipeCues(recipe);
  if (!recipe.captions) return [];
  const cues = recipeCues({ ...recipe, captions: { ...recipe.captions, enabled: true } });
  if (cues.length === 0) return [];
  return fillGaps(cues, outputSeconds(recipe)).map((c, i) => ({ ...c, index: i + 1, start: r1(c.start), end: r1(c.end) }));
}

/** The spot of the removed text (24 Nov 2026): measured after the removal, else the guess from before it; none without text removal. */
export function coverBoxOf(input: { removeText?: boolean; removedTextBox?: CoverBox | null; oldTextBox?: CoverBox | null }): CoverBox | undefined {
  if (!input.removeText) return undefined;
  return input.removedTextBox ?? input.oldTextBox ?? undefined;
}

/* ---------- caption places and moving old text (26 Nov 2026) ---------- */

export type EditCover = { box?: CoverBox; track?: CoverSegment[] };

/** The measured track (source seconds) on the edited video's clock, which runs longer with natural pace; only when the text really moves. */
export function coverTrackFor(track: CoverSegment[] | null | undefined, sourceSeconds: number | undefined, editSeconds: number): CoverSegment[] | undefined {
  if (!isMoving(track)) return undefined;
  const f = sourceSeconds && sourceSeconds > 0 ? editSeconds / sourceSeconds : 1;
  const out = track.map((t) => ({ start: r1(t.start * f), end: r1(Math.min(editSeconds, t.end * f)), box: t.box })).filter((t) => t.end - t.start >= 0.1);
  if (out.length) out[out.length - 1] = { ...out[out.length - 1], end: editSeconds };
  return isMoving(out) ? out : undefined;
}

const isCovered = (cover: EditCover) => Boolean(cover.box || cover.track?.length);

/** Does this export need a caption layer per place? (Lines moved by the customer, or old text that moved.) */
export function needsLayers(recipe: EditRecipe, cover: EditCover): boolean {
  if (!recipe.captions) return false;
  if (!recipe.captions.enabled && !isCovered(cover)) return false;
  return isMoving(cover.track) || recipe.captions.cues.some((c) => c.place && c.place !== "auto");
}

/** Where a line goes: a fixed place, the old text's spot (one spot, or the spot of its stretch), or the chosen position. */
export function layerKeyOf(cue: Pick<RecipeCue, "start" | "end" | "place">, recipe: EditRecipe, cover: EditCover): string {
  const place = cue.place ?? "auto";
  if (place !== "auto") return place;
  if (isMoving(cover.track)) return `spot-${segmentForCue(cover.track, cue)}`;
  if (cover.box) return "spot";
  return recipe.captions?.position === "middle" ? "middle" : "low";
}

/** The box of a spot key ("spot" or "spot-<i>"); null for the fixed places. */
export function spotBox(key: string, cover: EditCover): CoverBox | null {
  if (key === "spot") return cover.box ?? null;
  const m = /^spot-(\d+)$/.exec(key);
  return m && cover.track?.[Number(m[1])] ? cover.track[Number(m[1])].box : null;
}

/** The lines per place on the output's clock (each place becomes one caption layer of the export). */
export function exportLayers(recipe: EditRecipe, cover: EditCover): { key: string; cues: RecipeCue[] }[] {
  if (!recipe.captions) return [];
  if (!recipe.captions.enabled && !isCovered(cover)) return [];
  const ranges = keptRanges(recipe);
  const groups = new Map<string, RecipeCue[]>();
  for (const cue of recipe.captions.cues) {
    const text = cue.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const key = layerKeyOf(cue, recipe, cover);
    let offset = 0;
    for (const r of ranges) {
      const st = Math.max(cue.start, r.start);
      const e = Math.min(cue.end, r.end);
      if (e - st >= 0.2) groups.set(key, [...(groups.get(key) ?? []), { index: 0, start: r1(offset + (st - r.start)), end: r1(offset + (e - r.start)), text }]);
      offset += r.end - r.start;
    }
  }
  return [...groups.entries()].map(([key, list]) => ({ key, cues: list.sort((a, b) => a.start - b.start).map((c, i) => ({ ...c, index: i + 1 })) }));
}

/** The bars that hide the cleaned spot, on the output's clock: per stretch of moving text, else one spot for the whole video. */
export function coverBarsOnOutput(recipe: EditRecipe, cover: EditCover): CoverSegment[] {
  const segments = isMoving(cover.track) ? cover.track : cover.box ? [{ start: 0, end: recipe.sourceSeconds, box: cover.box }] : [];
  const out: CoverSegment[] = [];
  let offset = 0;
  for (const r of keptRanges(recipe)) {
    for (const seg of segments) {
      const st = Math.max(seg.start, r.start);
      const e = Math.min(seg.end, r.end);
      if (e - st >= 0.1) out.push({ start: r1(offset + (st - r.start)), end: r1(offset + (e - r.start)), box: seg.box });
    }
    offset += r.end - r.start;
  }
  return out;
}

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
  // Over removed text the captions are always on: the srtUrl then comes from exportCues(recipe, true).
  const cover: EditCover = { box: input.coverBox, track: input.coverTrack };
  if (recipe.captions && input.layers?.length) {
    // A layer per place (26 Nov 2026), each for the whole video so its SRT times are output times; over
    // removed text the bars below hide the cleaned spot per stretch.
    for (const layer of input.layers) tracks.push({ clips: [layerClip(recipe.captions.style, layer.key, layer.srtUrl, total, frame, ink, light, input.colors?.accent, cover)] });
    const bars = isCovered(cover) ? coverBarsOnOutput(recipe, cover) : [];
    const barColor = barMeta(effectiveBar(captionStyleOf(recipe.captions.style), true)).color ?? "#FFFFFF";
    if (bars.length) tracks.push({ clips: bars.map((b) => barClip(b, frame, barColor, recipe.captions!.style.size)) });
  } else if (recipe.captions && (recipe.captions.enabled || input.coverBox) && input.srtUrl) {
    tracks.push({ clips: [captionClip(recipe.captions.style, recipe.captions.position, input.srtUrl, total, frame, ink, light, input.colors?.accent, input.coverBox)] });
  }
  // Lower third: a line of text in a soft dark bar at the top or the bottom.
  const lt = recipe.lowerThird?.enabled && recipe.lowerThird.text.trim() ? overlayWindow(recipe.lowerThird.from, recipe.lowerThird.to, recipe) : null;
  if (lt && recipe.lowerThird) {
    tracks.push({ clips: [textClip(recipe.lowerThird.text.trim(), lt, { frame, y: recipe.lowerThird.position === "top" ? 0.36 : -0.26, font: Math.round(frame.width * 0.042), color: light, background: ink, opacity: 0.78, weight: 600 })] });
  }
  tracks.push({ clips: videoClips });
  // Background music under the voice, repeated to fill when it is shorter, faded in and out.
  if (recipe.music?.enabled && input.music) tracks.push({ clips: musicClips(input.music.url, input.music.seconds, total, input.music.volume) });

  const output = input.size ? { format: "mp4", size: frame, fps: 25 } : { format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 };
  const fonts = timelineFontsFor(recipe.captions?.style);
  return { timeline: { background: ink, ...(fonts.length ? { fonts } : {}), tracks }, output, meta: { totalSeconds: total, pieces: ranges.length } };
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

function captionClip(style: CaptionStyleChoice, position: "low" | "middle", srtUrl: string, total: number, frame: { width: number; height: number }, ink: string, light: string, accent?: string, coverBox?: CoverBox) {
  const look = captionStyleOf(style);
  // A background behind the words (any colour since 2 Nov 2026): the words then take a colour that reads on it, without outline.
  // Over removed text there is always one, fully opaque and fixed on the old text's spot (same rule as buildCaptionEdit).
  const bar = barMeta(effectiveBar(look, Boolean(coverBox)));
  const fit = coverBox && bar.color ? fitCaptionToCover(coverBox, frame, look.size) : null;
  const fontPx = fit ? fit.fontPx : CAPTION_SIZE_PX[look.size];
  const text = bar.color ? readableOn(look.textColor ?? light, bar.color) : look.textColor ?? light;
  const stroke = bar.color ? { width: 0, color: light, opacity: 0 } : { width: 8, color: ink, opacity: 1 };
  const chosen = look.color ?? accent ?? "#D43F1B";
  // A highlight in the box's own colour would vanish: it turns red (or white on red), as in the caption render.
  const color = bar.color && chosen.toLowerCase() === bar.color.toLowerCase() ? (bar.color.toUpperCase() === "#D43F1B" ? "#FFFFFF" : "#D43F1B") : chosen;
  const active =
    look.highlight === "box" ? { font: { color: text, background: color }, stroke } : look.highlight === "color" ? { font: { color }, stroke } : look.highlight === "underline" ? { font: { color, textDecoration: "underline" }, stroke } : undefined;
  const background = !bar.color ? null : fit ? { color: bar.color, opacity: 1, borderRadius: 18 } : { color: bar.color, opacity: bar.opacity, borderRadius: 18, wrap: true, padding: 18 };
  const lines = Math.round(fontPx * 2 * 1.25 + 12);
  return {
    asset: {
      type: "rich-caption",
      src: srtUrl,
      font: { family: captionFontOf(look).family, size: fontPx, color: text, opacity: 1, weight: captionFontOf(look).weight },
      style: { textTransform: look.uppercase ? "uppercase" : "none" },
      stroke,
      animation: { style: bar.color ? "highlight" : "pop" },
      ...(active ? { active } : {}),
      ...(background ? { background } : { border: { width: 0, color: ink, opacity: 1, radius: 16 } }),
      padding: fit ? { top: 8, right: 14, bottom: 8, left: 14 } : { top: 6, right: 10, bottom: 6, left: 10 },
      align: { horizontal: "center", vertical: "middle" },
    },
    start: 0,
    length: total,
    width: fit ? fit.widthPx : Math.round(frame.width * 0.833),
    height: fit ? Math.max(lines, fit.heightPx) : lines,
    offset: { x: 0, y: fit ? fit.offsetY : position === "middle" ? 0 : -0.18 },
  };
}

/** One caption layer: on a spot of old text (its bar lies under it), or at a fixed place with the chosen background. */
function layerClip(style: CaptionStyleChoice, key: string, srtUrl: string, total: number, frame: { width: number; height: number }, ink: string, light: string, accent: string | undefined, cover: EditCover) {
  const look = captionStyleOf(style);
  const covered = isCovered(cover);
  const bar = barMeta(effectiveBar(look, covered));
  const box = spotBox(key, cover);
  const fit: CaptionFit | null = box ? fitCaptionToCover(box, frame, look.size) : null;
  const fontPx = fit ? fit.fontPx : CAPTION_SIZE_PX[look.size];
  const text = bar.color ? readableOn(look.textColor ?? light, bar.color) : look.textColor ?? light;
  const stroke = bar.color ? { width: 0, color: light, opacity: 0 } : { width: 8, color: ink, opacity: 1 };
  const chosen = look.color ?? accent ?? "#D43F1B";
  const color = bar.color && chosen.toLowerCase() === bar.color.toLowerCase() ? (bar.color.toUpperCase() === "#D43F1B" ? "#FFFFFF" : "#D43F1B") : chosen;
  const active =
    look.highlight === "box" ? { font: { color: text, background: color }, stroke } : look.highlight === "color" ? { font: { color }, stroke } : look.highlight === "underline" ? { font: { color, textDecoration: "underline" }, stroke } : undefined;
  // On a spot the bar is a shape under the layer; at a fixed place the box wraps the words (opaque over removed text).
  const background = fit || !bar.color ? null : { color: bar.color, opacity: covered ? 1 : bar.opacity, borderRadius: 18, wrap: true, padding: 18 };
  const lines = Math.round(fontPx * 2 * 1.25 + 12);
  const y = fit ? fit.offsetY : PLACE_OFFSET[(key === "top" || key === "middle" ? key : "low") as "top" | "middle" | "low"];
  const font = captionFontOf(look);
  return {
    asset: {
      type: "rich-caption",
      src: srtUrl,
      font: { family: font.family, size: fontPx, color: text, opacity: 1, weight: font.weight },
      style: { textTransform: look.uppercase ? "uppercase" : "none" },
      stroke,
      animation: { style: bar.color ? "highlight" : "pop" },
      ...(active ? { active } : {}),
      ...(background ? { background } : { border: { width: 0, color: ink, opacity: 1, radius: 16 } }),
      padding: fit ? { top: 8, right: 14, bottom: 8, left: 14 } : { top: 6, right: 10, bottom: 6, left: 10 },
      align: { horizontal: "center", vertical: "middle" },
    },
    start: 0,
    length: total,
    width: fit ? fit.widthPx : Math.round(frame.width * 0.833),
    height: fit ? Math.max(lines, fit.heightPx) : lines,
    offset: { x: 0, y },
  };
}

/** An opaque bar over a stretch of cleaned spot (a rectangle shape), sized like the caption box over it. */
function barClip(segment: CoverSegment, frame: { width: number; height: number }, color: string, size: CaptionStyleChoice["size"]) {
  const fit = fitCaptionToCover(segment.box, frame, size);
  const h = Math.max(Math.round(fit.fontPx * 2 * 1.25 + 12), fit.heightPx);
  return {
    asset: { type: "shape", shape: "rectangle", width: fit.widthPx, height: h, fill: { color, opacity: 1 }, rectangle: { width: fit.widthPx, height: h, cornerRadius: 18 } },
    start: segment.start,
    length: r1(Math.max(0.1, segment.end - segment.start)),
    offset: { x: 0, y: fit.offsetY },
  };
}

/** Music clips that fill the video: repeated when the track is shorter, the first fading in and the last fading out. */
export function musicClips(url: string, seconds: number | undefined, total: number, volume: number) {
  const v = Math.round(clamp(volume, 0, MUSIC_MAX_VOLUME) * 100) / 100;
  const len = seconds && seconds >= 3 ? seconds : total;
  const clips: Record<string, unknown>[] = [];
  for (let at = 0; at < total - 0.05 && clips.length < 40; at += len) {
    const length = r1(Math.min(len, total - at));
    clips.push({ asset: { type: "audio", src: url, volume: v }, start: r1(at), length });
  }
  if (clips.length === 1) (clips[0].asset as Record<string, unknown>).effect = "fadeInFadeOut";
  else if (clips.length > 1) {
    (clips[0].asset as Record<string, unknown>).effect = "fadeIn";
    (clips[clips.length - 1].asset as Record<string, unknown>).effect = "fadeOut";
  }
  return clips;
}

/** The render service takes at most 1920 px per side and even numbers (same rule as finalEdit.ts). */
function fitSize(size: { width: number; height: number }) {
  const scale = Math.min(1, 1920 / Math.max(size.width, size.height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(size.width), height: even(size.height) };
}
