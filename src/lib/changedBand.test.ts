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
