import { describe, expect, it } from "vitest";
import { COLOR_GRID, colorLabel, hexToHsv, hsvToHex, normalizeHex } from "./colors";

describe("colours for the picker", () => {
  it("reads short and long hex, with or without the hash, and refuses the rest", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex("d43f1b")).toBe("#D43F1B");
    expect(normalizeHex(" #1F3A5F ")).toBe("#1F3A5F");
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#GGGGGG")).toBeNull();
  });

  it("round-trips every grid colour through HSV", () => {
    for (const c of COLOR_GRID) expect(hsvToHex(hexToHsv(c.hex))).toBe(c.hex.toUpperCase());
    expect(hexToHsv("#FF0000")).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv("#000000")).toEqual({ h: 0, s: 0, v: 0 });
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe("#00FF00");
  });

  it("offers about thirty distinct standard colours with the product's own red and yellow among them", () => {
    const hexes = COLOR_GRID.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
    expect(hexes.length).toBeGreaterThanOrEqual(28);
    expect(hexes.length).toBeLessThanOrEqual(36);
    expect(hexes).toContain("#D43F1B");
    expect(hexes).toContain("#FFD400");
    expect(colorLabel("#d43f1b")).toBe("Red");
    expect(colorLabel("#123456")).toBe("#123456");
  });
});
