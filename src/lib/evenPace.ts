import type { Segment } from "@/lib/types";

/**
 * One even speaking pace for the whole video (28 Oct 2026, Tijs): the voice speeds up wherever a
 * translated line holds more text than its moment allows, so a short first line with a long sentence
 * sounded rushed and the end slow. The pace of the whole translation (characters per second) gives
 * every line a target length for its moment; the quality check writes each line near its target.
 * Pure and browser-safe.
 */
export type PaceTarget = { index: number; target: number; current: number; seconds: number };

export function evenPaceTargets(segments: Pick<Segment, "index" | "start" | "end" | "text">[]): PaceTarget[] {
  const timed = segments.map((s) => ({ index: s.index, seconds: Math.max(0.3, s.end - s.start), current: s.text.trim().length }));
  const seconds = timed.reduce((n, s) => n + s.seconds, 0);
  const chars = timed.reduce((n, s) => n + s.current, 0);
  const rate = seconds > 0 ? chars / seconds : 0;
  return timed.map((s) => ({ ...s, target: Math.max(4, Math.round(rate * s.seconds)) }));
}

/** How uneven the pace is: the fastest line's pace over the slowest line's, 1 = perfectly even. */
export function paceSpread(segments: Pick<Segment, "start" | "end" | "text">[]) {
  const rates = segments.filter((s) => s.text.trim()).map((s) => s.text.trim().length / Math.max(0.3, s.end - s.start));
  if (rates.length < 2) return 1;
  return Math.max(...rates) / Math.max(1, Math.min(...rates));
}
