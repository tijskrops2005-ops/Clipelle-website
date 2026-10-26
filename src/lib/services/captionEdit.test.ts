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
