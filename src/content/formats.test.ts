import { describe, expect, it } from "vitest";
import { FORMATS, formatByKey, isFormatKey } from "./formats";
import { AD_TONES, DIRECTION_MAX_CHARS } from "@/lib/adOptions";

describe("format library", () => {
  it("has unique keys, valid tones and directions that fit the Direction field", () => {
    expect(new Set(FORMATS.map((f) => f.key)).size).toBe(FORMATS.length);
    for (const f of FORMATS) {
      expect(AD_TONES).toContain(f.tone);
      expect(f.direction.length).toBeLessThanOrEqual(DIRECTION_MAX_CHARS);
      expect(f.structure.length).toBeGreaterThanOrEqual(3);
      expect(f.nl.name.length).toBeGreaterThan(0);
    }
  });
  it("looks formats up by key", () => {
    expect(formatByKey("unboxing")?.name).toBe("Unboxing");
    expect(formatByKey("nope")).toBeUndefined();
    expect(isFormatKey("offer")).toBe(true);
    expect(isFormatKey("Offer")).toBe(false);
  });
});
