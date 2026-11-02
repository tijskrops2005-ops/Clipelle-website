import { describe, expect, it } from "vitest";
import { DEFAULT_CAPTION_STYLE } from "@/lib/captionOptions";
import { clearLastChoices, LAST_CHOICES_KEY, lastChoicesSummary, readLastChoices, writeLastChoices } from "./lastChoices";

function fakeStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), map: m };
}

describe("last choices", () => {
  it("round-trips the choices and stamps the time", () => {
    const s = fakeStore();
    writeLastChoices({ targets: ["de", "fr"], quality: "precision", format: "original", captionPosition: "middle", captionStyle: { ...DEFAULT_CAPTION_STYLE, uppercase: false, color: "#123456", textColor: "#ABCDEF" }, removeMusic: true, cleanVoice: false }, s);
    const c = readLastChoices(s)!;
    expect(c.targets).toEqual(["de", "fr"]);
    expect(c.quality).toBe("precision");
    expect(c.format).toBe("original");
    expect(c.captionPosition).toBe("middle");
    expect(c.captionStyle.uppercase).toBe(false);
    // Colours never carry over (2 Nov 2026): the next video starts with the default or brand colours.
    expect(c.captionStyle.color).toBe(DEFAULT_CAPTION_STYLE.color);
    expect(c.captionStyle.textColor).toBe(DEFAULT_CAPTION_STYLE.textColor);
    expect(c.removeMusic).toBe(true);
    expect(Date.parse(c.at)).toBeGreaterThan(0);
    expect(lastChoicesSummary(c, (code) => code.toUpperCase())).toBe("DE, FR · Precision · original size");
  });

  it("ignores odd or old values and empty language lists", () => {
    const s = fakeStore();
    s.setItem(LAST_CHOICES_KEY, JSON.stringify({ targets: ["xx", "nl"], quality: "turbo", format: "4:3", captionStyle: { show: false, bogus: 1 } }));
    const c = readLastChoices(s)!;
    expect(c.targets).toEqual(["nl"]);
    expect(c.quality).toBe("speed");
    expect(c.format).toBe("9:16");
    expect(c.captionStyle.show).toBe(false);
    expect("bogus" in c.captionStyle).toBe(false);
    s.setItem(LAST_CHOICES_KEY, JSON.stringify({ targets: [] }));
    expect(readLastChoices(s)).toBeNull();
    s.setItem(LAST_CHOICES_KEY, "{not json");
    expect(readLastChoices(s)).toBeNull();
    expect(readLastChoices(null)).toBeNull();
  });

  it("clears", () => {
    const s = fakeStore();
    writeLastChoices({ targets: ["nl"], quality: "speed", format: "9:16", captionPosition: "low", captionStyle: DEFAULT_CAPTION_STYLE, removeMusic: false, cleanVoice: false }, s);
    clearLastChoices(s);
    expect(readLastChoices(s)).toBeNull();
  });
});
