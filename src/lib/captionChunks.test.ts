import { describe, expect, it } from "vitest";
import { chunkCues } from "./captionChunks";

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
