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

describe("natural pace keeps meaning (28 Oct 2026)", () => {
  it("takes a fuller correction within the stretched limit, without a warning", () => {
    const s = [{ ...seg(2, 1.34, 5.1, "Darmgezondheid is dit jaar een prioriteit voor me geworden."), original: "Gut health has become such a priority for me this year, especially with everything my body's been through." }];
    const full = "Darmgezondheid is dit jaar echt een prioriteit voor me geworden, zeker na alles wat mijn lichaam heeft meegemaakt.";
    expect(full.length).toBeGreaterThan(maxCharsForSegment(1.34, 5.1) * 1.3);
    const r = applyCorrections(s, [{ index: 2, ok: false, corrected: full, issue: "Restored what was left out." }], 1.3);
    expect(r.segments[0].text).toBe(full);
    expect(r.warnings).toHaveLength(0);
  });
});

describe("groupWarnings", () => {
  it("turns the same warning on several lines into one", async () => {
    const { groupWarnings } = await import("./plainQa");
    const msg = "shortened as far as the timing allows; it is still a little long and may be spoken slightly faster.";
    expect(groupWarnings([2, 3, 4, 5, 6, 7].map((n) => `Line ${n}: ${msg}`))).toEqual([`Lines 2–7: ${msg}`]);
    expect(groupWarnings([`Line 2: ${msg}`, `Line 5: ${msg}`, "Something else."])).toEqual([`Lines 2 and 5: ${msg}`, "Something else."]);
    expect(groupWarnings([`Line 1: ${msg}`])).toEqual([`Line 1: ${msg}`]);
  });
});

describe("lineLimit", () => {
  it("gives a fast speaker room for what they said, and a calm speaker the usual limit", async () => {
    const { lineLimit } = await import("./translationCorrections");
    expect(lineLimit({ start: 0, end: 4, original: "" })).toBe(60);
    expect(lineLimit({ start: 0, end: 4, original: "" }, 1.3)).toBe(78);
    expect(lineLimit({ start: 0, end: 4, original: "x".repeat(100) })).toBe(110);
  });
});
