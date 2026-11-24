import { describe, expect, it } from "vitest";
import { buildEditFromRecipe, coverBoxOf, defaultRecipe, exportCues, exportCredits, fromOutputTime, keptRanges, outputSeconds, overlayWindow, recipeCues, recipeSummary, toOutputTime, type EditRecipe } from "./editRecipe";

const cues = [
  { index: 1, start: 0, end: 3, text: "Hello there" },
  { index: 2, start: 3, end: 8, text: "this serum works" },
  { index: 3, start: 8, end: 12, text: "buy it today" },
];

function recipe(patch: Partial<EditRecipe> = {}): EditRecipe {
  return { ...defaultRecipe(30, { cues }), ...patch };
}

describe("edit recipe", () => {
  it("keeps the whole video by default and counts credits per six seconds", () => {
    const r = recipe();
    expect(keptRanges(r)).toEqual([{ start: 0, end: 30 }]);
    expect(outputSeconds(r)).toBe(30);
    expect(exportCredits(30)).toBe(5);
    expect(exportCredits(2)).toBe(2);
    expect(exportCredits(61)).toBe(11);
  });

  it("trims and cuts, ignoring pieces too small to matter, and sorts the cuts", () => {
    const r = recipe({ trim: { start: 2, end: 28 }, cuts: [{ start: 20, end: 22 }, { start: 10, end: 12.5 }, { start: 15, end: 15.2 }] });
    expect(keptRanges(r)).toEqual([{ start: 2, end: 10 }, { start: 12.5, end: 20 }, { start: 22, end: 28 }]);
    expect(outputSeconds(r)).toBe(21.5);
    expect(toOutputTime(5, r)).toBe(3);
    expect(toOutputTime(11, r)).toBeNull();
    expect(toOutputTime(13, r)).toBe(8.5);
    expect(fromOutputTime(8.5, r)).toBe(13);
    expect(fromOutputTime(0, r)).toBe(2);
  });

  it("moves the caption lines onto the output's clock and clips a line that crosses a cut", () => {
    const r = recipe({ cuts: [{ start: 4, end: 9 }] });
    const out = recipeCues(r);
    expect(out.map((c) => [c.start, c.end, c.text])).toEqual([
      [0, 3, "Hello there"],
      [3, 4, "this serum works"],
      [4, 7, "buy it today"],
    ]);
    expect(recipeCues(recipe({ captions: { ...r.captions!, enabled: false } }))).toEqual([]);
  });

  it("places a text overlay on the output's clock and drops it when it was cut away", () => {
    const r = recipe({ trim: { start: 5, end: 30 } });
    expect(overlayWindow(10, 14, r)).toEqual({ start: 5, end: 9 });
    expect(overlayWindow(0, 4, r)).toBeNull();
  });

  it("builds one render job: a clip per kept piece, captions, text, call to action and logo on their own tracks", () => {
    const r = recipe({ cuts: [{ start: 10, end: 12 }], lowerThird: { enabled: true, text: "Dr. Sam, dermatologist", from: 1, to: 6, position: "bottom" }, cta: { enabled: true, text: "Shop now", from: 25, to: 30 }, logo: { enabled: true } });
    const edit = buildEditFromRecipe(r, { videoUrl: "https://x/video.mp4", srtUrl: "https://x/c.srt", logoUrl: "https://x/logo.png" });
    const tracks = edit.timeline.tracks as { clips: { asset: { type: string; src?: string; text?: string }; start: number; length: number }[] }[];
    const videos = tracks[tracks.length - 1].clips;
    expect(videos.map((c) => [c.start, c.length])).toEqual([[0, 10], [10, 18]]);
    expect(edit.meta).toEqual({ totalSeconds: 28, pieces: 2 });
    expect(tracks.map((t) => t.clips[0].asset.type)).toEqual(["image", "rich-text", "rich-caption", "rich-text", "video"]);
    const cta = tracks[1].clips[0];
    expect(cta.asset.text).toBe("Shop now");
    expect([cta.start, cta.length]).toEqual([23, 5]);
    expect(edit.output).toEqual({ format: "mp4", resolution: "1080", aspectRatio: "9:16", fps: 25 });
  });

  it("leaves out what is off or not available: no logo URL, captions off, empty text", () => {
    const r = recipe({ captions: { ...recipe().captions!, enabled: false }, lowerThird: { enabled: true, text: "   ", from: 0, to: 5, position: "top" }, logo: { enabled: true } });
    const edit = buildEditFromRecipe(r, { videoUrl: "https://x/video.mp4", size: { width: 1280, height: 720 } });
    const tracks = edit.timeline.tracks as { clips: { asset: { type: string } }[] }[];
    expect(tracks.map((t) => t.clips[0].asset.type)).toEqual(["video"]);
    expect(edit.output).toEqual({ format: "mp4", size: { width: 1280, height: 720 }, fps: 25 });
    expect(recipeSummary(r)).toEqual(["captions off", "logo"]);
    expect(recipeSummary(recipe({ trim: { start: 1, end: 30 }, cuts: [{ start: 5, end: 7 }] }))).toEqual(["trimmed", "1 cut"]);
  });

  describe("over removed text (24 Nov 2026)", () => {
    const cover = { top: 0.62, bottom: 0.69, left: 0.2, right: 0.8 };
    type Clip = { asset: { type: string; background?: { opacity: number; wrap?: boolean; color: string } }; width: number; height: number; offset: { y: number } };
    const captionClipOf = (edit: ReturnType<typeof buildEditFromRecipe>) =>
      (edit.timeline.tracks as { clips: Clip[] }[]).flatMap((t) => t.clips).find((c) => c.asset.type === "rich-caption");

    it("takes the measured spot, else the guess, and none without text removal", () => {
      expect(coverBoxOf({ removeText: true, removedTextBox: cover, oldTextBox: { top: 0, bottom: 0.1, left: 0, right: 1 } })).toEqual(cover);
      expect(coverBoxOf({ removeText: true, removedTextBox: null, oldTextBox: cover })).toEqual(cover);
      expect(coverBoxOf({ removeText: false, removedTextBox: cover })).toBeUndefined();
    });

    it("keeps captions on, from the first frame to the last, even when switched off", () => {
      const r = recipe({ captions: { ...recipe().captions!, enabled: false }, cuts: [{ start: 4, end: 9 }] });
      expect(recipeCues(r)).toEqual([]);
      const out = exportCues(r, true);
      expect(out[0].start).toBe(0);
      expect(out[out.length - 1].end).toBe(outputSeconds(r));
      for (let i = 1; i < out.length; i++) expect(out[i].start).toBe(out[i - 1].end);
    });

    it("puts the captions on one fixed, opaque box over the spot", () => {
      const r = recipe({ captions: { ...recipe().captions!, enabled: false, style: { ...recipe().captions!.style, bar: "none" } } });
      const clip = captionClipOf(buildEditFromRecipe(r, { videoUrl: "https://x/v.mp4", srtUrl: "https://x/c.srt", coverBox: cover }));
      expect(clip).toBeDefined();
      expect(clip!.asset.background).toMatchObject({ opacity: 1 });
      expect(clip!.asset.background!.wrap).toBeUndefined();
      // Centred on the spot (offset is up from the centre) and covering it with a margin.
      const centre = 0.5 - clip!.offset.y;
      expect(Math.abs(centre - (cover.top + cover.bottom) / 2)).toBeLessThan(0.02);
      expect(clip!.height / 1920).toBeGreaterThan(cover.bottom - cover.top);
      expect(clip!.width / 1080).toBeGreaterThan(cover.right - cover.left);
    });

    it("changes nothing without removed text", () => {
      const r = recipe();
      const a = buildEditFromRecipe(r, { videoUrl: "https://x/v.mp4", srtUrl: "https://x/c.srt" });
      expect(exportCues(r, false)).toEqual(recipeCues(r));
      expect(captionClipOf(a)!.offset.y).toBe(-0.18);
    });
  });
});
