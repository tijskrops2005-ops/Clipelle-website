import { describe, expect, it } from "vitest";
import { applyCorrections } from "./translationCorrections";
import { plainQa } from "./plainQa";
import { maxCharsForSegment } from "./translatePricing";
import type { Segment } from "./types";

const seg = (index: number, start: number, end: number, text: string): Segment => ({ index, start, end, original: "", text } as Segment);

describe("applyCorrections", () => {
  it("takes a correction that fits the timing", () => {
    const s = [seg(1, 0, 4, "Het bleek dat ik ze al die tijd helemaal verkeerd deed.")];
    const r = applyCorrections(s, [{ index: 1, ok: false, corrected: "Ik deed ze al die tijd fout.", issue: "too long" }]);
    expect(r.segments[0].text).toBe("Ik deed ze al die tijd fout.");
    expect(r.changes).toHaveLength(1);
  });

  it("takes a shorter correction even when it is still over the limit (test A, 25 Oct 2026)", () => {
    const original = "Kamo, mijn dokter zegt al jaren tegen me dat ik Kegeloefeningen moet doen.";
    const corrected = "Gast, mijn dokter zegt al jaren: doe Kegeloefeningen.";
    const s = [seg(1, 1.16, 4.28, original)];
    expect(corrected.length).toBeGreaterThan(maxCharsForSegment(1.16, 4.28));
    const r = applyCorrections(s, [{ index: 1, ok: false, corrected, issue: "replaced the non-word 'Kamo'" }]);
    expect(r.segments[0].text).toBe(corrected);
    expect(r.warnings[0]).toMatch(/still a little long/);
  });

  it("keeps the original when the correction is longer and does not fit", () => {
    const s = [seg(1, 0, 1, "Kort.")];
    const r = applyCorrections(s, [{ index: 1, ok: false, corrected: "Een veel langere zin die nergens in past.", issue: "x" }]);
    expect(r.segments[0].text).toBe("Kort.");
    expect(r.changes).toHaveLength(0);
  });

  it("leaves ok fragments alone and turns flagged-but-unfixed ones into warnings", () => {
    const s = [seg(1, 0, 3, "Goed."), seg(2, 3, 6, "Twijfel.")];
    const r = applyCorrections(s, [{ index: 1, ok: true, corrected: null, issue: null }, { index: 2, ok: false, corrected: null, issue: "unclear source" }]);
    expect(r.segments.map((x) => x.text)).toEqual(["Goed.", "Twijfel."]);
    expect(r.warnings).toEqual(["Line 2: unclear source"]);
  });
});


describe("plainQa", () => {
  it("turns the stored test A warning into plain words", () => {
    const old = "Line 1: Over the 47-character limit (75 chars); shortened. Also replaced the non-standard 'Kamo' with 'Gast'. Still over limit, so reduced further below. ; kept the original translation.";
    const out = plainQa(old);
    expect(out).not.toMatch(/char|limit|; ;|\. ;/i);
    expect(out).toMatch(/Kamo/);
    expect(out).toMatch(/first translation was kept/);
    expect(plainQa("Over the 38-character limit (55 chars); shortened while keeping the meaning.")).toBe("Shortened to fit the timing while keeping the meaning.");
  });
});
