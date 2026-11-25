import { describe, expect, it } from "vitest";
import { BUSINESS_TIERS, MIN_MARGIN, PLANS, PLAN_LEVELS } from "./plans";
import { ENHANCE_CREDITS, ENHANCE_USD, imageCredits, imageOutput, imageSize, maxVideoSeconds, videoCredits, videoEstimateUsd, videoFactor, videoOutput } from "./enhanceRules";

const cheapestCredit = Math.min(...[...PLANS, ...PLAN_LEVELS, ...BUSINESS_TIERS].filter((p) => p.monthlyUsd > 0).map((p) => p.annualMonthlyUsd / p.creditsPerMonth));

describe("enhancer rules", () => {
  it("keeps the margin on the cheapest credit of every plan", () => {
    const perCredit = [
      ENHANCE_USD.upTo1080 / ENHANCE_CREDITS.videoPerSecond["1080p"],
      ENHANCE_USD.above1080 / ENHANCE_CREDITS.videoPerSecond["4k"],
      (ENHANCE_USD.above1080 * 2) / (ENHANCE_CREDITS.videoPerSecond["4k"] * ENHANCE_CREDITS.highFpsMultiplier),
      ENHANCE_USD.image / ENHANCE_CREDITS.image,
    ];
    for (const cost of perCredit) expect(cheapestCredit / cost).toBeGreaterThanOrEqual(MIN_MARGIN);
  });

  it("brings the short side to the target, never shrinks, never above 8×", () => {
    expect(videoFactor(720, 1280, "1080p")).toBe(1.5);
    expect(videoFactor(1080, 1920, "1080p")).toBe(1);
    expect(videoFactor(2160, 3840, "1080p")).toBe(1);
    expect(videoFactor(1080, 1920, "4k")).toBe(2);
    expect(videoFactor(120, 200, "4k")).toBe(8);
    expect(videoOutput(720, 1280, "1080p")).toEqual({ factor: 1.5, width: 1080, height: 1920 });
  });

  it("charges per second with a minimum, double above 30 fps", () => {
    expect(videoCredits(4, "1080p")).toBe(10);
    expect(videoCredits(30.4, "1080p")).toBe(30);
    expect(videoCredits(30, "4k")).toBe(120);
    expect(videoCredits(30, "1080p", 60)).toBe(60);
    expect(videoCredits(30, "1080p", 29.97)).toBe(30);
  });

  it("prices the provider by the output size and keeps a job inside the limit per action", () => {
    expect(videoEstimateUsd(30, 720, 1280, "1080p")).toBe(0.6);
    expect(videoEstimateUsd(10, 1080, 1920, "4k")).toBe(0.8);
    expect(maxVideoSeconds(1.5, "1080p")).toBe(75);
    expect(maxVideoSeconds(1.5, "4k")).toBe(18);
    expect(maxVideoSeconds(1.5, "1080p", true)).toBe(37);
    expect(maxVideoSeconds(100, "1080p")).toBe(180);
  });

  it("keeps an image at or below 24 megapixels", () => {
    expect(imageOutput(1000, 1000, "4x")).toEqual({ factor: 4, width: 4000, height: 4000, capped: false });
    const big = imageOutput(3000, 4000, "4x");
    expect(big.capped).toBe(true);
    expect(big.width * big.height).toBeLessThanOrEqual(24_000_000);
    expect(imageOutput(6000, 6000, "2x").factor).toBe(1);
    expect(imageCredits()).toBe(5);
  });

  it("reads the size of a PNG, a JPEG and a WebP", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x03, 0x20, 0, 0, 0x02, 0x58]);
    expect(imageSize(png)).toEqual({ width: 800, height: 600, type: "png" });
    // SOI, an APP0 of 16 bytes, then SOF0 with height 480 and width 640.
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0), 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0, 0, 0, 0, 0, 0]);
    expect(imageSize(jpeg)).toEqual({ width: 640, height: 480, type: "jpeg" });
    const webp = new Uint8Array(30);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58]);
    webp.set([0x1f, 0x03, 0x00, 0x57, 0x02, 0x00], 24); // 799+1 × 599+1
    expect(imageSize(webp)).toEqual({ width: 800, height: 600, type: "webp" });
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
