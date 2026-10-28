/**
 * Customer wording for quality-check text that was stored before 26 Oct 2026: character counts and
 * limits removed, stray separators tidied. New checks are written in plain words already.
 */
export function plainQa(text: string) {
  return text
    .replace(/Over the \d+-character limit(?: \(\d+ chars?\))?;?\s*shortened(\.?)/gi, (_m, dot: string) => `Shortened to fit the timing${dot}`)
    .replace(/\s*\(\d+ (?:of \d+ )?char(?:acter)?s?\)/gi, "")
    .replace(/exceeded the character limits?/gi, "were too long for the timing")
    .replace(/the \d+-character limit/gi, "the timing")
    .replace(/character limits?/gi, "timing")
    .replace(/Still over limit, so reduced further below\.?\s*/gi, "")
    .replace(/\s*;\s*kept the original translation\.?/gi, " The first translation was kept.")
    .replace(/\.\s*;\s*/g, ". ")
    .replace(/\s+;/g, ";")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * The same warning on several lines becomes one (28 Oct 2026: a test showed "Line 2: shortened…" seven
 * times in a row). "Lines 2–7: …" for a run, "Lines 2, 4 and 6: …" otherwise; other warnings stay as they are.
 */
export function groupWarnings(warnings: string[]): string[] {
  const groups = new Map<string, number[]>();
  const order: string[] = [];
  for (const w of warnings) {
    const m = /^Line (\d+): (.+)$/.exec(w.trim());
    const key = m ? m[2] : `\u0000${w}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    if (m) groups.get(key)!.push(Number(m[1]));
  }
  return order.map((key) => {
    if (key.startsWith("\u0000")) return key.slice(1);
    const lines = [...new Set(groups.get(key)!)].sort((a, b) => a - b);
    if (lines.length === 1) return `Line ${lines[0]}: ${key}`;
    const run = lines.every((n, i) => i === 0 || n === lines[i - 1] + 1);
    const label = run ? `${lines[0]}–${lines[lines.length - 1]}` : `${lines.slice(0, -1).join(", ")} and ${lines[lines.length - 1]}`;
    return `Lines ${label}: ${key}`;
  });
}
