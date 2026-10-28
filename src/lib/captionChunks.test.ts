import { describe, expect, it } from "vitest";
import { chunkCues, fillGaps } from "./captionChunks";

describe("short caption chunks (27 Oct 2026)", () => {
  const long = { index: 1, start: 0.14, end: 12.98, text: "Mijn moeder is stiekem een beetje boos op me, omdat ik mijn vader de coffee ritual set heb gegeven. Zijn opgeblazen gevoel verdween veel sneller dan verwacht, en andere vrouwen merkten het ook." };
  it("cuts a long line into pieces of at most two caption lines, covering the same time", () => {
    const out = chunkCues([long], 32);
    expect(out.length).toBeGreaterThanOrEqual(6);
    for (const c of out) expect(c.text.length).toBeLessThanOrEqual(38);
    expect(out[0].start).toBe(0.14);
    expect(out[out.length - 1].end).toBe(12.98);
    for (let i = 1; i < out.length; i++) expect(out[i].start).toBeCloseTo(out[i - 1].end, 3);
    expect(out.map((c) => c.text).join(" ")).toBe(long.text);
    // A new sentence starts a new chunk.
    expect(out.some((c) => c.text.startsWith("Zijn"))).toBe(true);
  });
  it("leaves short lines alone and numbers the chunks", () => {
    expect(chunkCues([{ index: 7, start: 1, end: 2, text: "Hallo daar" }])).toEqual([{ index: 1, start: 1, end: 2, text: "Hallo daar" }]);
  });
});

describe("captions over removed text never leave the screen (27 Oct 2026)", () => {
  it("runs from 0 to the end with no gaps between lines", () => {
    const out = fillGaps([{ index: 2, start: 3.65, end: 5.69, text: "b" }, { index: 1, start: 0.14, end: 3.39, text: "a" }, { index: 3, start: 9.46, end: 12.92, text: "c" }], 13.2);
    expect(out.map((c) => [c.start, c.end])).toEqual([[0, 3.65], [3.65, 9.46], [9.46, 13.2]]);
    expect(out.map((c) => c.text)).toEqual(["a", "b", "c"]);
  });
});

describe("chunks sized to the real caption box (28 Oct 2026)", () => {
  it("makes chunks smaller for the narrower bar over removed text", async () => {
    const { chunkCharsFor } = await import("./captionChunks");
    expect(chunkCharsFor("medium", 900)).toBe(32);
    expect(chunkCharsFor("medium", 756)).toBe(27);
    expect(chunkCharsFor("large", 300)).toBe(14);
  });

  it("never lets a sentence end push a chunk past two lines of the narrow bar (the selenium line)", async () => {
    const { chunkCharsFor } = await import("./captionChunks");
    const max = chunkCharsFor("medium", 756);
    const out = chunkCues([{ index: 1, start: 14.7, end: 17.76, text: "Rijk aan selenium, essentieel voor een gezonde schildklier." }], max);
    for (const c of out) expect(c.text.length).toBeLessThanOrEqual(max + Math.round(max * 0.15));
    expect(out.map((c) => c.text).join(" ")).toBe("Rijk aan selenium, essentieel voor een gezonde schildklier.");
  });
});
