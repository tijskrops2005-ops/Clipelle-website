import { describe, expect, it } from "vitest";
import { changedBand } from "./changedBand";
import { COVER_MARGIN_PX, fitCaptionToCover, fontFromCover, SAFE_BOTTOM, SAFE_TOP } from "./captionFit";

const frame = { width: 1080, height: 1920 };
const m = COVER_MARGIN_PX / frame.height;

/** A frame pair as the measurement sees them: 180×320 grey pixels; the source has "text" (noise) in a band, the cleaned frame is flat there. */
function framePair(band: { top: number; bottom: number; left: number; right: number } | null) {
  const w = 180;
  const h = 320;
  const source = new Uint8Array(w * h);
  const cleaned = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const base = 90 + ((x + y) % 7) * 3; // a quiet background with mild texture, identical on both
      source[y * w + x] = base;
      cleaned[y * w + x] = base;
      if (band && y >= band.top && y < band.bottom && x >= band.left && x < band.right) source[y * w + x] = (x * 37 + y * 11) % 2 ? 250 : 10; // letters
    }
  return { source, cleaned, w, h };
}

describe("caption box over removed text", () => {
  it("small original text: a smaller font and a box that still covers the smudge with its margin", () => {
    const { source, cleaned, w, h } = framePair({ top: 240, bottom: 250, left: 60, right: 120 });
    const band = changedBand(source, cleaned, w, h)!;
    expect(band).not.toBeNull();
    const fit = fitCaptionToCover(band, frame);
    expect(fit.lines).toBe(1);
    expect(fit.fontPx).toBeLessThan(62);
    expect(fit.covers).toBe(true);
    expect(fit.box.top).toBeLessThanOrEqual(band.top - m + 1e-6);
    expect(fit.box.bottom).toBeGreaterThanOrEqual(band.bottom + m - 1e-6);
    expect(fit.widthPx).toBeGreaterThanOrEqual((band.right - band.left) * frame.width + 2 * COVER_MARGIN_PX);
    expect(fit.widthPx).toBeLessThan(0.92 * frame.width);
  });

  it("large original text: two lines, a bigger font, a box at least as big as the smudge, never above the largest size", () => {
    const { source, cleaned, w, h } = framePair({ top: 200, bottom: 245, left: 15, right: 165 });
    const band = changedBand(source, cleaned, w, h)!;
    const fit = fitCaptionToCover(band, frame);
    expect(fit.lines).toBe(2);
    expect(fit.fontPx).toBeGreaterThanOrEqual(62);
    expect(fit.fontPx).toBeLessThanOrEqual(76);
    expect(fit.covers).toBe(true);
    expect(fit.heightPx).toBeGreaterThanOrEqual((band.bottom - band.top) * frame.height + 2 * COVER_MARGIN_PX);
    expect(fit.widthPx).toBe(Math.round((0.92 * frame.width) / 2) * 2);
  });

  it("no original text: nothing to cover", () => {
    const { source, cleaned, w, h } = framePair(null);
    expect(changedBand(source, cleaned, w, h)).toBeNull();
  });

  it("stays inside the safe zones and grows instead of sliding off a smudge at the very bottom", () => {
    const low = { top: 0.9, bottom: 0.94, left: 0.3, right: 0.7 };
    const fit = fitCaptionToCover(low, frame);
    expect(fit.covers).toBe(true);
    expect(fit.box.bottom).toBeGreaterThanOrEqual(low.bottom + m - 1e-6);
    const high = { top: 0.02, bottom: 0.05, left: 0.3, right: 0.7 };
    const top = fitCaptionToCover(high, frame);
    expect(top.covers).toBe(true);
    expect(top.box.top).toBeLessThanOrEqual(high.top - m + 1e-6);
    const mid = fitCaptionToCover({ top: 0.7, bottom: 0.74, left: 0.3, right: 0.7 }, frame);
    expect(mid.box.top).toBeGreaterThanOrEqual(SAFE_TOP);
    expect(mid.box.bottom).toBeLessThanOrEqual(1 - SAFE_BOTTOM);
  });

  it("long lines get fewer characters per chunk in a narrow box and more in a wide one", () => {
    const narrow = fitCaptionToCover({ top: 0.7, bottom: 0.725, left: 0.35, right: 0.65 }, frame);
    const wide = fitCaptionToCover({ top: 0.64, bottom: 0.74, left: 0.05, right: 0.95 }, frame);
    expect(narrow.chunkChars).toBeGreaterThanOrEqual(10);
    expect(wide.chunkChars).toBeGreaterThan(narrow.chunkChars);
    expect(fontFromCover({ top: 0.7, bottom: 0.705, left: 0, right: 1 }, frame).fontPx).toBe(34);
  });
});
