import { describe, expect, it } from "vitest";
import { lengthCheck, missingWords, scoreReport, skipped, spokenCheck, wordErrorRate, wordsOf } from "./report";

describe("quality report (28 Oct 2026)", () => {
  it("compares words without capitals, punctuation or accents", () => {
    expect(wordsOf("Gebalanceerde hormonen, een gelukkiger MEISJE. Clipelle.com")).toEqual(["gebalanceerde", "hormonen", "een", "gelukkiger", "meisje", "clipelle", "com"]);
    expect(wordsOf("Appétit")).toEqual(["appetit"]);
  });

  it("counts word errors like a speech test does", () => {
    expect(wordErrorRate(["a", "b", "c", "d"], ["a", "b", "c", "d"])).toBe(0);
    expect(wordErrorRate(["a", "b", "c", "d"], ["a", "c", "d"])).toBe(0.25);
    expect(wordErrorRate([], [])).toBe(0);
  });

  it("passes what was said as written, and names the words that were not heard", () => {
    const captions = "Ik eet elke dag twee paranoten. Rijk aan selenium, essentieel voor een gezonde schildklier.";
    expect(spokenCheck(captions, "ik eet elke dag twee paranoten rijk aan selenium essentieel voor een gezonde schildklier").status).toBe("pass");
    const skippedHalf = spokenCheck(captions, "ik eet elke dag twee paranoten");
    expect(skippedHalf.status).toBe("fail");
    expect(skippedHalf.items).toContain('Not heard: "selenium"');
    expect(missingWords(["clipelle", "com"], ["klipel", "com"])).toEqual(["clipelle"]);
  });

  it("warns when a name is said differently, even in an otherwise good match", async () => {
    const { namesIn } = await import("./report");
    expect(namesIn("Dan neem ik Clipelle. Gebalanceerde hormonen. Clipelle.com")).toEqual(["Clipelle", "Clipelle.com"]);
    const r = spokenCheck("Dan neem ik Clipelle. Darmgezondheid is dit jaar een prioriteit voor me geworden. Clipelle.com", "Dan neem ik Lipelle. Darmgezondheid is dit jaar een prioriteit voor me geworden. Lipelle.com");
    expect(r.status).toBe("warn");
    expect(r.items?.[0]).toContain("Clipelle");
  });

  it("flags a video that ends before the voice, or lost most of its length", () => {
    expect(lengthCheck(30, 23.5, 23.2).status).toBe("pass");
    expect(lengthCheck(30, 23.5, 24.4).status).toBe("fail");
    expect(lengthCheck(30, 12, 11.5).status).toBe("warn");
  });

  it("scores warnings and failures, never skipped checks", () => {
    const pass = { key: "meaning" as const, label: "", status: "pass" as const, detail: "" };
    expect(scoreReport([pass, skipped("spoken", "down")])).toBe(100);
    expect(scoreReport([{ ...pass, status: "warn" }, { ...pass, status: "fail" }])).toBe(58);
  });
});
