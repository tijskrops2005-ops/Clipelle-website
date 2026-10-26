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
