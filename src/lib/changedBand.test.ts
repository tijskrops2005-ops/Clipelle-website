import { describe, expect, it } from "vitest";
import { changedBand, joinBands } from "./changedBand";

/** A 100×200 grey frame; `paint` writes a bright block into a copy. */
function frame(paint?: { top: number; bottom: number; left: number; right: number }) {
  const w = 100, h = 200;
  const px = new Uint8Array(w * h).fill(90);
  if (paint) for (let y = paint.top; y < paint.bottom; y++) for (let x = paint.left; x < paint.right; x++) px[y * w + x] = 230;
  return px;
}

describe("the cleaned spot, measured from the pictures (27 Oct 2026)", () => {
  it("finds the band where the source and the cleaned picture differ", () => {
    const box = changedBand(frame({ top: 120, bottom: 131, left: 20, right: 80 }), frame(), 100, 200);
    expect(box).toEqual({ top: 0.6, bottom: 0.655, left: 0.2, right: 0.8 });
  });
  it("returns nothing when nothing changed or when the whole frame changed", () => {
    expect(changedBand(frame(), frame(), 100, 200)).toBeNull();
    expect(changedBand(frame({ top: 0, bottom: 200, left: 0, right: 100 }), frame(), 100, 200)).toBeNull();
  });
  it("joins the moments and drops one that does not line up", () => {
    const a = { top: 0.6, bottom: 0.65, left: 0.3, right: 0.7 };
    const b = { top: 0.61, bottom: 0.66, left: 0.2, right: 0.8 };
    const off = { top: 0.1, bottom: 0.2, left: 0, right: 1 };
    expect(joinBands([a, b, off])).toEqual({ top: 0.6, bottom: 0.66, left: 0.2, right: 0.8 });
    expect(joinBands([null, null])).toBeNull();
  });
});

describe("joining the bands of ten moments (29 Oct 2026)", () => {
  it("covers every moment's text and leaves out a whole-width outlier", async () => {
    const { joinBands } = await import("./changedBand");
    const bands = [null, { top: 0.828, bottom: 0.881, left: 0.122, right: 0.761 }, { top: 0.806, bottom: 0.878, left: 0.217, right: 0.783 }, { top: 0.363, bottom: 0.566, left: 0.417, right: 0.75 }, { top: 0.769, bottom: 0.984, left: 0, right: 1 }, { top: 0.784, bottom: 0.875, left: 0.211, right: 0.85 }, { top: 0.809, bottom: 0.875, left: 0.061, right: 0.939 }, { top: 0.828, bottom: 0.888, left: 0.139, right: 0.889 }];
    expect(joinBands(bands)).toEqual({ top: 0.784, bottom: 0.888, left: 0.061, right: 0.939 });
  });
});
