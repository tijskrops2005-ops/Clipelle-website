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

export type ProductOverlay = {
  start: number;
  length: number;
  /** Offset into the product clip, so repeated overlays show different pieces. */
  trim: number;
  effect: "zoomInSlow" | "zoomOutSlow";
  /** The benefits text sits on this overlay. */
  withBenefits: boolean;
};

export type SceneKind = "hook" | "presenter" | "product" | "benefits" | "offer";
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
    effect: i % 2 === 0 ? "zoomInSlow" : "zoomOutSlow",
    withBenefits: i === 0,
  }));

  const scenes: LayoutScene[] = [{ kind: "hook", start: 0, length: HOOK_SECONDS }];
  let cursor = HOOK_SECONDS;
  for (const o of overlays) {
    if (o.start > cursor) scenes.push({ kind: "presenter", start: cursor, length: r1(o.start - cursor) });
    scenes.push({ kind: o.withBenefits ? "benefits" : "product", start: o.start, length: o.length });
    cursor = r1(o.start + o.length);
  }
  const offerStart = r1(total - END_CARD_SECONDS);
  if (offerStart > cursor) scenes.push({ kind: "presenter", start: cursor, length: r1(offerStart - cursor) });
  scenes.push({ kind: "offer", start: offerStart, length: END_CARD_SECONDS });

  return { totalSeconds: total, maxWords: maxSpokenWords(total), overlays, scenes };
}

/** One line per scene, e.g. "hook 0–2 s: hook text on screen". */
export function describeLayout(layout: AdLayout): string[] {
  const what: Record<SceneKind, string> = {
    hook: "hook text large on screen over the presenter",
    presenter: "presenter in frame",
    product: "product clip over the presenter (voice continues)",
    benefits: "product clip with the three benefits as text (voice continues)",
    offer: "end card: offer headline and CTA button over the presenter",
  };
  return layout.scenes.map((s) => `${s.kind} ${s.start}–${r1(s.start + s.length)} s: ${what[s.kind]}`);
}

export { WORDS_PER_SECOND };
