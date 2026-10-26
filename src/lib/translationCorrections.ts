import { maxCharsForSegment } from "@/lib/translatePricing";
import type { Segment } from "@/lib/types";

/** One fragment as the quality check returns it. */
export type CheckedFragment = { index: number; ok: boolean; corrected: string | null; issue: string | null };

/**
 * Applies the quality check's corrections (25 Oct 2026, pure so it can be tested). A correction is
 * taken when it fits the fragment's timing, or when it is shorter than the current text: then it is
 * better on both counts even if still long (the old rule kept the original, which on test A kept a
 * wrong word in a line that was even longer). A correction that is longer than both is not taken.
 */
export function applyCorrections(segments: Segment[], fragments: CheckedFragment[]) {
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
    const max = maxCharsForSegment(s.start, s.end);
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
