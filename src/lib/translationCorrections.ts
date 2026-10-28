import { maxCharsForSegment } from "@/lib/translatePricing";
import type { Segment } from "@/lib/types";

/**
 * The character limit of one line (28 Oct 2026). The base is a calm 15 characters per second; a fast
 * speaker gets room for what they really said (the source line plus 10%, since most languages run
 * a little longer than English), and natural pace stretches it further. Before, a fast speaker's
 * lines were cut to half and lost whole clauses.
 */
export function lineLimit(s: Pick<Segment, "start" | "end" | "original">, stretch = 1) {
  const calm = Math.round(maxCharsForSegment(s.start, s.end) * stretch);
  const spoken = s.original?.trim() ? Math.round(s.original.trim().length * 1.1) : 0;
  return Math.max(calm, spoken);
}

/** One fragment as the quality check returns it. */
export type CheckedFragment = { index: number; ok: boolean; corrected: string | null; issue: string | null };

/**
 * Applies the quality check's corrections (25 Oct 2026, pure so it can be tested). A correction is
 * taken when it fits the fragment's timing, or when it is shorter than the current text: then it is
 * better on both counts even if still long (the old rule kept the original, which on test A kept a
 * wrong word in a line that was even longer). A correction that is longer than both is not taken.
 * `stretch` widens the limit when the video may stretch to the new language (natural pace, 28 Oct 2026).
 */
export function applyCorrections(segments: Segment[], fragments: CheckedFragment[], stretch = 1) {
  const byIndex = new Map(fragments.map((f) => [f.index, f]));
  const changes: { index: number; before: string; after: string; reason: string }[] = [];
  const warnings: string[] = [];
  const out = segments.map((s) => {
    const f = byIndex.get(s.index);
    if (!f || f.ok || !f.corrected) {
      if (f && !f.ok && f.issue) warnings.push(`Line ${s.index}: ${f.issue}`);
      return s;
    }
    const corrected = f.corrected.replace(/\s+/g, " ").trim();
    const max = lineLimit(s, stretch);
    if (!corrected || corrected === s.text) return s;
    const fits = corrected.length <= max;
    if (!fits && corrected.length >= s.text.length) {
      warnings.push(`Line ${s.index}: the corrected line did not fit the timing, so the first translation was kept. Worth a quick listen.`);
      return s;
    }
    if (!fits) warnings.push(`Line ${s.index}: shortened as far as the timing allows; it is still a little long and may be spoken slightly faster.`);
    changes.push({ index: s.index, before: s.text, after: corrected, reason: f.issue ?? "corrected" });
    return { ...s, text: corrected };
  });
  return { segments: out, changes, warnings };
}
