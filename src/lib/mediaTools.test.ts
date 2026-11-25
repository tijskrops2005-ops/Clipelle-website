import { describe, expect, it } from "vitest";
import { BUSINESS_TIERS, MIN_MARGIN, PLANS, PLAN_LEVELS } from "./plans";
import { MEDIA_TOOL_KEYS, isMediaToolKey, mediaCredits, mediaEstimateUsd, normaliseOptions, optionsLabel, videoBackgroundUsd } from "./mediaTools";

const cheapestCredit = Math.min(...[...PLANS, ...PLAN_LEVELS, ...BUSINESS_TIERS].filter((p) => p.monthlyUsd > 0).map((p) => p.annualMonthlyUsd / p.creditsPerMonth));

describe("media tools", () => {
  it("keeps the margin on the cheapest credit for every tool and length", () => {
    for (const tool of MEDIA_TOOL_KEYS) {
      for (const seconds of [1, 5, 10, 30, 60, 180]) {
        const perCredit = mediaEstimateUsd(tool, seconds) / mediaCredits(tool, seconds);
        expect(cheapestCredit / perCredit, `${tool} ${seconds}s`).toBeGreaterThanOrEqual(MIN_MARGIN);
      }
    }
  });

  it("keeps the video background margin at more pixels and more frames per second", () => {
    for (const [w, h, fps] of [[1080, 1920, 30], [1080, 1920, 60], [1920, 1920, 30], [1920, 1080, 50], [720, 1280, 24]]) {
      for (const seconds of [5, 30, 120]) {
        const perCredit = videoBackgroundUsd(w, h, fps, seconds) / mediaCredits("video-background", seconds, { width: w, height: h, fps });
        expect(cheapestCredit / perCredit, `${w}x${h}@${fps} ${seconds}s`).toBeGreaterThanOrEqual(MIN_MARGIN);
      }
    }
    expect(mediaCredits("video-background", 20, { width: 1080, height: 1920, fps: 60 })).toBe(120);
  });

  it("knows its own tools only", () => {
    expect(isMediaToolKey("captions")).toBe(true);
    expect(isMediaToolKey("constructor")).toBe(false);
    expect(isMediaToolKey("toString")).toBe(false);
  });

  it("charges per second, per two seconds or per image, with minimums", () => {
    expect(mediaCredits("remove-text", 4)).toBe(10);
    expect(mediaCredits("remove-text", 30.4)).toBe(30);
    expect(mediaCredits("captions", 30)).toBe(15);
    expect(mediaCredits("captions", 31)).toBe(16);
    expect(mediaCredits("resize", 3)).toBe(5);
    expect(mediaCredits("remove-background")).toBe(2);
    expect(mediaCredits("transcribe", 4)).toBe(2);
    expect(mediaCredits("transcribe", 60)).toBe(12);
    expect(mediaCredits("video-background", 3)).toBe(15);
    expect(mediaCredits("video-background", 20)).toBe(60);
    expect(mediaCredits("clean-voice", 30)).toBe(15);
  });

  it("fills in defaults and drops unknown options", () => {
    expect(normaliseOptions("captions", { preset: "nope", position: "middle" } as never)).toEqual({ preset: "bold", position: "middle", format: "9:16" });
    expect(normaliseOptions("resize", { mode: "fit" })).toEqual({ mode: "fit" });
    expect(normaliseOptions("remove-text", { mode: "fit" })).toEqual({});
    expect(optionsLabel("captions", { preset: "yellow", format: "original" })).toBe("Yellow word, Original size");
    expect(normaliseOptions("video-background", { background: "red" })).toEqual({ background: "#FFFFFF" });
    expect(normaliseOptions("video-background", { background: "transparent" })).toEqual({ background: "transparent" });
    expect(normaliseOptions("clean-voice", { strength: "loud" as never })).toEqual({ strength: "normal" });
  });
});
