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
