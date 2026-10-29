import { describe, expect, it } from "vitest";

describe("readable caption colours (28 Oct 2026)", () => {
  it("gives every colour a black outline and black words a white one", async () => {
    const { outlineFor, CAPTION_TEXT_COLORS } = await import("./captionOptions");
    for (const c of CAPTION_TEXT_COLORS) expect(outlineFor(c.value)).toBe(c.value === "#111114" ? "#FFFFFF" : "#111114");
  });

  it("keeps a text colour on a bar only with real contrast", async () => {
    const { readableOn, contrastRatio } = await import("./captionOptions");
    expect(readableOn("#22C55E", "#FFFFFF")).toBe("#111114");
    expect(readableOn("#FFD400", "#111114")).toBe("#FFD400");
    expect(readableOn("#D43F1B", "#FFFFFF")).toBe("#D43F1B");
    expect(contrastRatio("#FFFFFF", "#111114")).toBeGreaterThan(18);
  });
});

describe("captions over removed text (29 Oct 2026)", () => {
  it("are always on and always on a bar", async () => {
    const { styleOverRemovedText, effectiveBar, barChoices } = await import("./captionOptions");
    expect(styleOverRemovedText({ show: false, bar: "none" })).toMatchObject({ show: true, bar: "white" });
    expect(styleOverRemovedText({ bar: "yellow" })).toMatchObject({ show: true, bar: "yellow" });
    expect(effectiveBar({ bar: "none" }, true)).toBe("white");
    expect(effectiveBar({ bar: "none" }, false)).toBe("none");
    expect(barChoices(true)).not.toContain("none");
    expect(barChoices(false)).toContain("none");
  });
});
