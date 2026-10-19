import { WORDS_PER_SECOND, maxSpokenWords } from "@/lib/pricing";

/**
 * What is on screen while the presenter talks the whole ad. Pure and browser-safe:
 * the script prompt uses it to tell Claude the scene plan, the Shotstack edit uses it
 * to place the product-clip overlays, and the dev pages show it.
 *
 * Structure: presenter video as the base for the full length; hook text over it in the
 * first 2 s; the one product clip laid over it at fixed moments (the same clip, different
 * pieces, alternating zoom) with the benefits as text on the first overlay; end card with
 * the CTA button in the last 2 s. Music softly underneath.
 */

export const HOOK_SECONDS = 2;
export const END_CARD_SECONDS = 2;
/** Length of one product-clip overlay (3 s for a 10-second ad, else 4 s). */
const overlayLength = (total: number) => (total < 15 ? 3 : 4);
/** How many times the product clip appears. */
const overlayCount = (total: number) => (total <= 12 ? 1 : total <= 36 ? 2 : total <= 50 ? 3 : 4);

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Camera moves on the product footage, one per overlay, never the same twice in a row. */
export type OverlayMotion = {
  /** Shotstack clip effect (slow pan or zoom). */
  effect: "zoomInSlow" | "zoomOutSlow" | "slideUpSlow" | "slideDownSlow" | "slideLeftSlow" | "slideRightSlow";
  /** Crop: 1 = whole product; >1 = a detail, with offset choosing the part (top = neckline, bottom = hem). */
  scale: number;
  offsetY: number;
  /** Soft transitions, about 0.5 s (Shotstack "Fast" variants). */
  transitionIn: "fadeFast" | "slideLeftFast" | "slideRightFast" | "slideUpFast";
  transitionOut: "fadeFast" | "slideLeftFast" | "slideRightFast" | "slideDownFast";
  label: string;
};

export const OVERLAY_MOTIONS: OverlayMotion[] = [
  { effect: "zoomInSlow", scale: 1, offsetY: 0, transitionIn: "fadeFast", transitionOut: "fadeFast", label: "whole product, slow zoom in" },
  { effect: "slideDownSlow", scale: 1.6, offsetY: 0.18, transitionIn: "slideLeftFast", transitionOut: "slideLeftFast", label: "top detail, slow pan down" },
  { effect: "zoomOutSlow", scale: 1.5, offsetY: 0, transitionIn: "slideUpFast", transitionOut: "fadeFast", label: "middle detail, slow zoom out" },
  { effect: "slideUpSlow", scale: 1.6, offsetY: -0.22, transitionIn: "slideRightFast", transitionOut: "slideRightFast", label: "lower detail, slow pan up" },
  { effect: "slideLeftSlow", scale: 1.3, offsetY: 0.05, transitionIn: "fadeFast", transitionOut: "slideDownFast", label: "upper half, slow pan left" },
];

export type ProductOverlay = {
  start: number;
  length: number;
  /** Offset into the product clip, so repeated overlays show different pieces. */
  trim: number;
  motion: OverlayMotion;
  /** Odd overlays use the prepared product photo (slow pan) when one is available, for variety. */
  usePhoto: boolean;
};

export type SceneKind = "presenter" | "product";
export type LayoutScene = { kind: SceneKind; start: number; length: number };

export type AdLayout = {
  totalSeconds: number;
  maxWords: number;
  overlays: ProductOverlay[];
  /** The timeline as a sequence, for the prompt and the UI. */
  scenes: LayoutScene[];
};

export function adLayout(totalSeconds: number, clipSeconds = 5): AdLayout {
  const total = r1(Math.max(6, totalSeconds));
  const len = Math.min(overlayLength(total), clipSeconds);
  const n = overlayCount(total);
  const windowStart = HOOK_SECONDS + 1.5;
  const windowEnd = total - END_CARD_SECONDS - 1;
  const free = Math.max(0, windowEnd - windowStart - n * len);
  const gap = free / (n + 1);
  const maxTrim = Math.max(0, clipSeconds - len);
  const overlays: ProductOverlay[] = Array.from({ length: n }, (_, i) => ({
    start: r1(windowStart + gap * (i + 1) + len * i),
    length: len,
    trim: r1(Math.min(maxTrim, (i % 2) * Math.min(1, maxTrim))),
    motion: OVERLAY_MOTIONS[i % OVERLAY_MOTIONS.length],
    usePhoto: i % 2 === 1,
  }));

  // Timeline as a sequence: presenter in frame, product footage, presenter again; the spoken hook
  // fills the first seconds and the spoken call to action the last ones (no text on screen).
  const scenes: LayoutScene[] = [];
  let cursor = 0;
  for (const o of overlays) {
    if (o.start > cursor) scenes.push({ kind: "presenter", start: cursor, length: r1(o.start - cursor) });
    scenes.push({ kind: "product", start: o.start, length: o.length });
    cursor = r1(o.start + o.length);
  }
  if (total > cursor) scenes.push({ kind: "presenter", start: cursor, length: r1(total - cursor) });

  return { totalSeconds: total, maxWords: maxSpokenWords(total), overlays, scenes };
}

/** One line per scene, e.g. "product 8.7–12.7 s: product footage (voice continues)". */
export function describeLayout(layout: AdLayout): string[] {
  const what: Record<SceneKind, string> = {
    presenter: "presenter in frame (captions only)",
    product: "product footage over the presenter (voice and captions continue)",
  };
  return layout.scenes.map((s, i) => {
    const extra = i === 0 ? "; the spoken hook opens here" : i === layout.scenes.length - 1 ? "; the spoken call to action closes here" : "";
    return `${s.kind} ${s.start}–${r1(s.start + s.length)} s: ${what[s.kind]}${extra}`;
  });
}

export { WORDS_PER_SECOND };
