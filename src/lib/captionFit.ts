import { CAPTION_SIZE_PX, type CaptionSize } from "@/lib/captionOptions";

/**
 * The caption box over removed text follows the old text (2 Nov 2026): small original text gives a
 * small box, big text a big box, on the same spot, and the box (background plus margin) is never
 * smaller than the smudge the removal left. At most two lines; inside the safe zones of a 9:16
 * frame; long lines are cut into more captions (`chunkChars`) instead of shrunk. Pure and
 * browser-safe: the render (src/lib/services/finalEdit.ts) and the edit screen's preview use it.
 */
export type CoverBox = { top: number; bottom: number; left: number; right: number };
export type Frame = { width: number; height: number };
export type CaptionFit = {
  fontPx: number;
  lines: 1 | 2;
  widthPx: number;
  heightPx: number;
  /** Shotstack offset.y: a fraction of the frame height, positive = up from the centre. */
  offsetY: number;
  /** The box as fractions of the frame, for previews and tests. */
  box: CoverBox;
  /** Characters per caption chunk that fit the box at this font size. */
  chunkChars: number;
  covers: boolean;
};

const LINE_HEIGHT = 1.25;
/** Asset padding (16) plus the pill's own padding (36), as in twoLineHeight for a box. */
const BOX_PAD = 52;
export const COVER_MARGIN_PX = 32;
const MIN_FONT = 34;
const MAX_FONT = CAPTION_SIZE_PX.large;
/** Safe zones of a 9:16 frame: platform chrome at the top and the bottom. */
export const SAFE_TOP = 0.06;
export const SAFE_BOTTOM = 0.1;
/** Roboto Black averages about 0.55 em per character. */
const GLYPH = 0.55;

const even = (n: number) => Math.max(2, Math.ceil(Math.round(n * 100) / 100 / 2) * 2);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Two caption lines of this font on a box, in pixels: the same rule as the render's twoLineHeight. */
export function boxLinesHeight(fontPx: number, lines: 1 | 2 = 2) {
  return Math.round(fontPx * lines * LINE_HEIGHT + BOX_PAD);
}

/** The font the old text had, read from the smudge's height: the lines it held and their height. */
export function fontFromCover(cover: CoverBox, frame: Frame): { fontPx: number; lines: 1 | 2 } {
  const smudgeH = (cover.bottom - cover.top) * frame.height;
  const lines: 1 | 2 = smudgeH > frame.height * 0.07 ? 2 : 1;
  const fontPx = clamp(Math.round(smudgeH / (lines * LINE_HEIGHT)), MIN_FONT, MAX_FONT);
  return { fontPx, lines };
}

export function fitCaptionToCover(cover: CoverBox, frame: Frame, chosen: CaptionSize = "medium"): CaptionFit {
  const W = frame.width;
  const H = frame.height;
  const { fontPx, lines } = fontFromCover(cover, frame);
  void chosen; // the customer's size choice is kept for the look elsewhere; over removed text the old text decides.
  const smudgeW = (cover.right - cover.left) * W;
  const smudgeH = (cover.bottom - cover.top) * H;
  // Always two lines high: the caption service fills its box before it turns the page, so the box height is what keeps captions to two lines.
  let heightPx = even(Math.max(boxLinesHeight(fontPx, 2), smudgeH + 2 * COVER_MARGIN_PX));
  const widthPx = even(clamp(smudgeW + 0.16 * W, 0.5 * W, 0.92 * W));
  // Centred on the smudge, kept inside the safe zones; when the safe zone would push the box off the smudge, the box grows to keep covering it.
  const margin = COVER_MARGIN_PX / H;
  let half = heightPx / 2 / H;
  let centre = clamp((cover.top + cover.bottom) / 2, SAFE_TOP + half, 1 - SAFE_BOTTOM - half);
  let top = centre - half;
  let bottom = centre + half;
  if (top > cover.top - margin || bottom < cover.bottom + margin) {
    top = Math.min(top, cover.top - margin);
    bottom = Math.max(bottom, cover.bottom + margin);
    heightPx = even((bottom - top) * H);
    half = heightPx / 2 / H;
    centre = (top + bottom) / 2;
  }
  const left = clamp(0.5 - widthPx / 2 / W, 0, 1);
  const right = clamp(0.5 + widthPx / 2 / W, 0, 1);
  const perLine = Math.floor((widthPx - 64) / (GLYPH * fontPx));
  const chunkChars = Math.max(10, lines === 2 ? perLine * 2 - 2 : perLine);
  const covers = top <= cover.top - margin + 1e-6 && bottom >= cover.bottom + margin - 1e-6 && left <= cover.left + 1e-6 && right >= cover.right - 1e-6;
  return { fontPx, lines, widthPx, heightPx, offsetY: Math.round(clamp(0.5 - centre, -0.42, 0.42) * 1000) / 1000, box: { top, bottom, left, right }, chunkChars, covers };
}
