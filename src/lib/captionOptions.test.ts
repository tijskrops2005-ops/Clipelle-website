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

describe("a background that fits the text colour (29 Oct 2026)", () => {
  it("switches white to dark for yellow or green text, and keeps a bar that already reads", async () => {
    const { barForText } = await import("./captionOptions");
    expect(barForText("#FFD400", "white", true)).toBe("dark");
    expect(barForText("#22C55E", "white", true)).toBe("dark");
    expect(barForText("#D43F1B", "white", true)).toBe("white");
    expect(barForText("#111114", "dark", true)).toBe("white");
    expect(barForText("#FFFFFF", "yellow", true)).toBe("dark");
  });
});

describe("any colour (2 Nov 2026, the one colour picker)", () => {
  it("reads a named bar, a free hex bar and none", async () => {
    const { barMeta, barFromHex, isBarOn } = await import("./captionOptions");
    expect(barMeta("white").color).toBe("#FFFFFF");
    expect(barMeta("#1F3A5F")).toMatchObject({ color: "#1F3A5F", opacity: barMeta("white").opacity });
    expect(barMeta("none").color).toBeNull();
    expect(barMeta("purple").color).toBeNull();
    expect(barFromHex("#FFFFFF")).toBe("white");
    expect(barFromHex("#111114")).toBe("dark");
    expect(barFromHex("#1f3a5f")).toBe("#1F3A5F");
    expect(barFromHex(null)).toBe("none");
    expect(isBarOn("#1F3A5F")).toBe(true);
    expect(isBarOn("none")).toBe(false);
  });
});
