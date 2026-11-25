import { joinBands, type Band } from "@/lib/changedBand";
import type { CoverBox } from "@/lib/captionFit";

/**
 * Old text that moves (26 Nov 2026, Tijs: "the blur must go"; his example ad has its text at the top,
 * then the bottom, then the middle). One box for the whole video kept only the most common spot, so the
 * smudge the removal left elsewhere stayed visible. A track is the box per stretch of time: the moments
 * are measured one by one, neighbours with the text on the same spot are grouped, and every group covers
 * its own stretch. Pure and browser-safe; the render, the edit export and the edit preview use it.
 */
export type CoverSegment = { start: number; end: number; box: CoverBox };

/** Two spots count as the same place when their centres are this close (a fraction of the frame height). */
const SAME_PLACE = 0.08;

const centre = (b: { top: number; bottom: number }) => (b.top + b.bottom) / 2;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** How many moments to measure: one per 1.5 s, at least 10 and at most 24. */
export function measureMoments(seconds: number) {
  return Math.min(24, Math.max(10, Math.ceil(Math.max(1, seconds) / 1.5)));
}

/** The moments (seconds) to measure for a video of this length, spread evenly and clear of the very ends. */
export function momentsFor(seconds: number) {
  const length = Math.max(1, seconds);
  const n = measureMoments(length);
  return Array.from({ length: n }, (_, i) => Math.round(Math.min(length - 0.15, 0.2 + ((length - 0.4) * i) / (n - 1)) * 100) / 100);
}

/**
 * Groups the measured moments into stretches with the text on one spot. A moment without a band (no
 * text on screen then) joins the stretch around it; a lone moment on another spot between two moments
 * on the same spot is treated as a frame that did not line up and joins its neighbours.
 */
export function trackFromBands(moments: number[], bands: (Band | null)[], seconds: number): CoverSegment[] {
  type Group = { idx: number[]; bands: Band[] };
  const groups: Group[] = [];
  for (let i = 0; i < moments.length; i++) {
    const band = bands[i];
    if (!band) continue;
    const last = groups[groups.length - 1];
    const lastCentre = last ? centre(joinBands(last.bands)!) : null;
    if (last && lastCentre !== null && Math.abs(centre(band) - lastCentre) <= SAME_PLACE) {
      last.idx.push(i);
      last.bands.push(band);
    } else {
      groups.push({ idx: [i], bands: [band] });
    }
  }
  // A lone moment between two groups on the same spot is noise: it is dropped and the neighbours join.
  for (let g = 1; g < groups.length - 1; g++) {
    const prev = groups[g - 1];
    const next = groups[g + 1];
    if (groups[g].idx.length === 1 && Math.abs(centre(joinBands(prev.bands)!) - centre(joinBands(next.bands)!)) <= SAME_PLACE) {
      prev.idx.push(...next.idx);
      prev.bands.push(...next.bands);
      groups.splice(g, 2);
      g--;
    }
  }
  if (groups.length === 0) return [];
  const length = Math.max(1, seconds);
  return groups.map((g, k) => {
    const first = moments[g.idx[0]];
    const lastMoment = moments[g.idx[g.idx.length - 1]];
    const start = k === 0 ? 0 : r2((moments[groups[k - 1].idx[groups[k - 1].idx.length - 1]] + first) / 2);
    const end = k === groups.length - 1 ? r2(length) : r2((lastMoment + moments[groups[k + 1].idx[0]]) / 2);
    return { start, end, box: joinBands(g.bands)! };
  });
}

/** Does the text really move? (Two or more stretches on spots that differ.) Otherwise one box is enough. */
export function isMoving(track: CoverSegment[] | null | undefined): track is CoverSegment[] {
  if (!track || track.length < 2) return false;
  const centres = track.map((s) => centre(s.box));
  return Math.max(...centres) - Math.min(...centres) > SAME_PLACE;
}

/**
 * The track on another clock: `factor` stretches the times (the translated video can be longer or
 * shorter than the source with natural pace), `shift` moves them (silence cut at the start), and
 * everything is kept inside 0…total.
 */
export function retimeTrack(track: CoverSegment[], o: { factor?: number; shift?: number; total: number }): CoverSegment[] {
  const f = o.factor && Number.isFinite(o.factor) && o.factor > 0 ? o.factor : 1;
  const shift = o.shift ?? 0;
  const out = track
    .map((s) => ({ start: r2(Math.max(0, s.start * f - shift)), end: r2(Math.min(o.total, s.end * f - shift)), box: s.box }))
    .filter((s) => s.end - s.start >= 0.1);
  if (out.length) {
    out[0] = { ...out[0], start: 0 };
    out[out.length - 1] = { ...out[out.length - 1], end: r2(o.total) };
  }
  return out;
}

/** The segment on screen at moment t (the last one past the end). */
export function segmentAt(track: CoverSegment[], t: number): CoverSegment | null {
  if (track.length === 0) return null;
  return track.find((s) => t >= s.start && t < s.end) ?? (t < track[0].start ? track[0] : track[track.length - 1]);
}

/** The segment a line overlaps most (its middle decides a tie). */
export function segmentForCue(track: CoverSegment[], cue: { start: number; end: number }): number {
  let best = 0;
  let bestOverlap = -1;
  track.forEach((s, i) => {
    const overlap = Math.min(s.end, cue.end) - Math.max(s.start, cue.start);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = i;
    }
  });
  return best;
}

/**
 * Lines grouped by where they go on screen: one group per distinct place. Each group becomes one
 * caption layer for the whole video holding only its own lines, so no layer's timing depends on where
 * it starts.
 */
export function groupByPlace<C extends { start: number; end: number }>(cues: C[], placeOf: (cue: C) => string): { place: string; cues: C[] }[] {
  const groups = new Map<string, C[]>();
  for (const cue of cues) {
    const key = placeOf(cue);
    groups.set(key, [...(groups.get(key) ?? []), cue]);
  }
  return [...groups.entries()].map(([place, list]) => ({ place, cues: list }));
}
