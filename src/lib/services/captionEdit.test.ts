import { describe, expect, it } from "vitest";
import { buildCaptionEdit } from "./finalEdit";

const base = { videoUrl: "https://x.test/v.mp4", seconds: 10, srtUrl: "https://x.test/c.srt" };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const captionAsset = (edit: ReturnType<typeof buildCaptionEdit>) => (edit.timeline as any).tracks[0].clips[0].asset;

describe("caption choices for a translation (26 Oct 2026)", () => {
  it("keeps the original look when nothing is chosen", () => {
    const a = captionAsset(buildCaptionEdit(base));
    expect(a.font.size).toBe(62);
    expect(a.style.textTransform).toBe("uppercase");
    expect(a.active.font).toEqual({ color: "#FFFFFF", background: "#D43F1B" });
  });

  it("maps every highlight, colour, size and capitals choice", () => {
    expect(captionAsset(buildCaptionEdit({ ...base, captionStyle: { highlight: "color", color: "#FFD400" } })).active.font).toEqual({ color: "#FFD400" });
    expect(captionAsset(buildCaptionEdit({ ...base, captionStyle: { highlight: "underline", color: "#22C55E" } })).active.font).toEqual({ color: "#22C55E", textDecoration: "underline" });
    expect(captionAsset(buildCaptionEdit({ ...base, captionStyle: { highlight: "none" } }))).not.toHaveProperty("active");
    const big = captionAsset(buildCaptionEdit({ ...base, captionStyle: { size: "large", uppercase: false } }));
    expect(big.font.size).toBe(76);
    expect(big.style.textTransform).toBe("none");
  });

  it("leaves the captions out when they are switched off, and keeps the video", () => {
    const edit = buildCaptionEdit({ ...base, captionStyle: { show: false } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks = (edit.timeline as any).tracks;
    expect(tracks).toHaveLength(1);
    expect(tracks[0].clips[0].asset.type).toBe("video");
  });
});

describe("translate with an AI presenter: the edit (26 Oct 2026)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracks = (e: any) => e.timeline.tracks;
  it("puts captions from the presenter's own audio over the presenter", async () => {
    const { buildPresenterTranslateEdit } = await import("./finalEdit");
    const e = buildPresenterTranslateEdit({ presenterUrl: "https://x.test/p.mp4", presenterSeconds: 12.34, layout: "presenter" });
    expect(tracks(e)).toHaveLength(2);
    expect(tracks(e)[0].clips[0].asset.src).toBe("alias://presenter");
    expect(tracks(e)[1].clips[0]).toMatchObject({ alias: "presenter", length: 12.3 });
  });
  it("overlays the presenter on the muted source, repeated to the presenter's length", async () => {
    const { buildPresenterTranslateEdit } = await import("./finalEdit");
    const e = buildPresenterTranslateEdit({ presenterUrl: "https://x.test/p.mp4", presenterSeconds: 25, layout: "overlay", sourceUrl: "https://x.test/s.mp4", sourceSeconds: 10 });
    const source = tracks(e)[2].clips;
    expect(source.map((c: { start: number; length: number }) => [c.start, c.length])).toEqual([[0, 10], [10, 10], [20, 5]]);
    expect(source[0].asset.volume).toBe(0);
    expect(tracks(e)[1].clips[0]).toMatchObject({ scale: 0.38, position: "topRight" });
  });
});

describe("caption text colour (26 Oct 2026)", () => {
  it("colours the words and gives dark text a light outline", () => {
    const a = captionAsset(buildCaptionEdit({ ...base, captionStyle: { textColor: "#111114" } }));
    expect(a.font.color).toBe("#111114");
    expect(a.stroke.color).toBe("#FFFFFF");
    const y = captionAsset(buildCaptionEdit({ ...base, captionStyle: { textColor: "#FFD400" } }));
    expect(y.font.color).toBe("#FFD400");
    expect(y.stroke.color).toBe("#111114");
  });
  it("makes the text in a light box dark so it stays readable", () => {
    const a = captionAsset(buildCaptionEdit({ ...base, captionStyle: { highlight: "box", color: "#FFD400" } }));
    expect(a.active.font).toEqual({ color: "#111114", background: "#FFD400" });
  });
});

describe("text removal: the original sound back under the cleaned picture (26 Oct 2026)", () => {
  it("puts the muted cleaned video over the original, which gives only the sound", async () => {
    const { buildRemuxEdit } = await import("./finalEdit");
    const e = buildRemuxEdit({ pictureUrl: "https://x.test/clean.mp4", soundUrl: "https://x.test/source.mp4", seconds: 30, size: { width: 1080, height: 1920 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [top, bottom] = (e.timeline as any).tracks;
    expect(top.clips[0].asset).toMatchObject({ src: "https://x.test/clean.mp4", volume: 0 });
    expect(bottom.clips[0].asset).toMatchObject({ src: "https://x.test/source.mp4", volume: 1 });
    expect(e.output).toMatchObject({ size: { width: 1080, height: 1920 } });
  });
});

describe("captions over removed text (27 Oct 2026)", () => {
  it("centres the captions and a soft bar on where the old text was", async () => {
    const { buildCaptionEdit } = await import("./finalEdit");
    const e = buildCaptionEdit({ ...base, coverBox: { top: 0.7, bottom: 0.78, left: 0.1, right: 0.9 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks = (e.timeline as any).tracks;
    expect(tracks).toHaveLength(3);
    expect(tracks[0].clips[0].offset.y).toBeCloseTo(-0.24, 2);
    expect(tracks[1].clips[0].asset).toMatchObject({ type: "shape", shape: "rectangle", fill: { opacity: 0.6 } });
    expect(tracks[1].clips[0].offset.y).toBe(tracks[0].clips[0].offset.y);
  });
  it("keeps the bar inside the frame and at least two caption lines high", async () => {
    const { coverBar } = await import("./finalEdit");
    const b = coverBar({ top: 0.96, bottom: 0.99 }, { width: 1080, height: 1920 }, 62);
    expect(b.height).toBeGreaterThanOrEqual(Math.round(62 * 2.6 + 40));
    expect(0.5 - b.offsetY + b.height / 2 / 1920).toBeLessThanOrEqual(1.001);
  });
  it("leaves the normal place when no old text was found", () => {
    const e = buildCaptionEdit(base);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((e.timeline as any).tracks).toHaveLength(2);
  });
});
