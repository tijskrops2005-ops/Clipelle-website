import { describe, expect, it } from "vitest";
import { firstChange, frameDiff } from "./sceneCut";

/** A 10×10 grid with a moving "speaker" blob on a background of `bg`. */
const frame = (bg: number, blobX = 3, blob = 60) => Array.from({ length: 100 }, (_, i) => (Math.abs((i % 10) - blobX) <= 1 && Math.floor(i / 10) >= 3 && Math.floor(i / 10) <= 7 ? blob : bg));

describe("scene change at the end (28 Oct 2026)", () => {
  it("measures how different two frames are", () => {
    expect(frameDiff(frame(200), frame(200))).toBe(0);
    expect(frameDiff(frame(200), frame(100))).toBeGreaterThan(50);
  });

  it("ignores a speaker who moves", () => {
    const frames = [3, 3, 4, 4, 5, 5, 4, 4, 3, 3].map((x) => frame(150, x));
    expect(firstChange(frames)).toBeNull();
  });

  it("finds a hard cut to an end card", () => {
    const frames = [...[3, 4, 4, 5, 5].map((x) => frame(150, x)), frame(240, 0, 240), frame(240, 0, 240)];
    expect(firstChange(frames)).toBe(5);
  });

  it("finds a fade to white before it is complete", () => {
    const frames = [frame(150), frame(150), frame(150), frame(165), frame(180), frame(195), frame(210), frame(225), frame(240)];
    const i = firstChange(frames)!;
    expect(i).toBeGreaterThanOrEqual(3);
    expect(i).toBeLessThanOrEqual(5);
  });
});
