import { describe, expect, it } from "vitest";
import { groupByPlace, isMoving, momentsFor, retimeTrack, segmentAt, segmentForCue, trackFromBands } from "./captionTrack";

const top = { top: 0.12, bottom: 0.2, left: 0.15, right: 0.85 };
const bottom = { top: 0.7, bottom: 0.78, left: 0.1, right: 0.9 };
const middle = { top: 0.46, bottom: 0.54, left: 0.2, right: 0.8 };

describe("caption track (old text that moves)", () => {
  it("measures more moments for longer videos, within 10 and 24", () => {
    expect(momentsFor(8)).toHaveLength(10);
    expect(momentsFor(30)).toHaveLength(20);
    expect(momentsFor(120)).toHaveLength(24);
    const m = momentsFor(30);
    expect(m[0]).toBeCloseTo(0.2);
    expect(m[m.length - 1]).toBeLessThanOrEqual(29.85);
  });

  it("splits the video where the text moves: top, then bottom, then middle", () => {
    const moments = [1, 3, 5, 7, 9, 11, 13, 15, 17];
    const bands = [top, top, top, bottom, bottom, null, bottom, middle, middle];
    const track = trackFromBands(moments, bands, 18);
    expect(track.map((s) => [s.start, s.end])).toEqual([[0, 6], [6, 14], [14, 18]]);
    expect(track[0].box.top).toBe(0.12);
    expect(track[1].box.top).toBe(0.7);
    expect(track[2].box.top).toBe(0.46);
    expect(isMoving(track)).toBe(true);
  });

  it("treats text on one spot as one stretch, and a lone misaligned frame as noise", () => {
    const moments = [1, 2, 3, 4, 5];
    const track = trackFromBands(moments, [bottom, bottom, top, bottom, bottom], 6);
    expect(track).toHaveLength(1);
    expect(track[0]).toMatchObject({ start: 0, end: 6 });
    expect(isMoving(track)).toBe(false);
    expect(trackFromBands(moments, [null, null, null, null, null], 6)).toEqual([]);
  });

  it("retimes the track for a stretched video and cut silence", () => {
    const track = [{ start: 0, end: 5, box: top }, { start: 5, end: 10, box: bottom }];
    const out = retimeTrack(track, { factor: 1.2, shift: 1, total: 11 });
    expect(out.map((s) => [s.start, s.end])).toEqual([[0, 5], [5, 11]]);
    expect(segmentAt(out, 7)?.box).toBe(bottom);
    expect(segmentForCue(out, { start: 4, end: 6.5 })).toBe(1);
  });

  it("groups lines by their place", () => {
    const groups = groupByPlace([{ start: 0, end: 1, p: "a" }, { start: 1, end: 2, p: "b" }, { start: 2, end: 3, p: "a" }], (c) => c.p);
    expect(groups.map((g) => [g.place, g.cues.length])).toEqual([["a", 2], ["b", 1]]);
  });
});
