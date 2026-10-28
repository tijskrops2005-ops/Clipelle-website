/**
 * The quality report of one finished language version (28 Oct 2026, Tijs: "testen, en dan wordt het
 * systeem beter en beter"). Only for the admin: every check says what it found in plain words, and the
 * score is a quick way to spot the videos worth a look. Pure and browser-safe; the services that
 * look at the video live in src/lib/services/qualityReview.ts.
 */

export type CheckStatus = "pass" | "warn" | "fail" | "skipped";

export type QualityCheck = {
  key: QualityCheckKey;
  label: string;
  status: CheckStatus;
  /** One plain sentence. */
  detail: string;
  /** Concrete findings, e.g. the parts of the source that were left out. */
  items?: string[];
};

export type QualityCheckKey = "meaning" | "spoken" | "oldText" | "captions" | "ending" | "framing" | "length";

export const CHECK_LABELS: Record<QualityCheckKey, string> = {
  meaning: "Meaning kept",
  spoken: "Spoken = captions",
  oldText: "Old text gone",
  captions: "Captions look right",
  ending: "Clean start and end",
  framing: "Face and product in frame",
  length: "Length",
};

/** What Tijs can mark on a report; the same list as the buttons on /admin/quality. */
export const RATING_LABELS = ["Lip sync off", "Voice sounds odd", "Wrong word", "Missing meaning", "Captions", "Cut wrong", "Picture", "Old text visible"] as const;

const WEIGHT: Record<CheckStatus, number> = { pass: 0, warn: 12, fail: 30, skipped: 0 };

/** 100 minus a weight per warning and failure; a skipped check does not count. */
export function scoreReport(checks: QualityCheck[]) {
  return Math.max(0, 100 - checks.reduce((n, c) => n + WEIGHT[c.status], 0));
}

/** Words without punctuation or capitals, for comparing what was said with what is on screen. */
export function wordsOf(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Word error rate: edits needed to turn the captions into what was heard, over the caption words. */
export function wordErrorRate(expected: string[], heard: string[]) {
  if (expected.length === 0) return heard.length ? 1 : 0;
  let prev = Array.from({ length: heard.length + 1 }, (_, j) => j);
  for (let i = 1; i <= expected.length; i++) {
    const row = [i];
    for (let j = 1; j <= heard.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (expected[i - 1] === heard[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[heard.length] / expected.length;
}

/** Caption words that were not heard at all (likely skipped or said differently), at most ten. */
export function missingWords(expected: string[], heard: string[]) {
  const pool = new Map<string, number>();
  for (const w of heard) pool.set(w, (pool.get(w) ?? 0) + 1);
  const missing: string[] = [];
  for (const w of expected) {
    const n = pool.get(w) ?? 0;
    if (n > 0) pool.set(w, n - 1);
    else if (w.length > 2) missing.push(w);
  }
  return [...new Set(missing)].slice(0, 10);
}

/**
 * Spoken = captions: the finished audio transcribed again and compared with the caption text. Speech
 * recognition itself makes small mistakes, so up to 12% is normal; above 25% something was skipped or
 * said wrongly.
 */
export function spokenCheck(captionText: string, heardText: string): QualityCheck {
  const expected = wordsOf(captionText);
  const heard = wordsOf(heardText);
  const wer = wordErrorRate(expected, heard);
  const pct = Math.round(wer * 100);
  const items = missingWords(expected, heard);
  // Names and brands count extra (28 Oct 2026: "Clipelle" was said as "Lipelle" twice in a 96% match).
  const heardSet = new Set(heard);
  const names = namesIn(captionText).filter((n) => wordsOf(n).some((w) => !heardSet.has(w)));
  const base: CheckStatus = wer <= 0.12 ? "pass" : wer <= 0.25 ? "warn" : "fail";
  const status: CheckStatus = base === "pass" && names.length ? "warn" : base;
  const detail = base === "pass" ? `What is said matches the captions (${100 - pct}% of the words)${names.length ? ", but a name sounds different" : ""}.` : `${pct}% of the caption words differ from what is said.`;
  const found = [...names.map((n) => `Name not heard as written: "${n}" (check the pronunciation)`), ...(base !== "pass" ? items.map((w) => `Not heard: "${w}"`) : [])];
  return { key: "spoken", label: CHECK_LABELS.spoken, status, detail, ...(found.length ? { items: found } : {}) };
}

/** Names, brands and web addresses in a text: capitalised words that do not start a sentence, and words with a dot inside. */
export function namesIn(text: string) {
  const out: string[] = [];
  const tokens = text.split(/\s+/).filter(Boolean);
  tokens.forEach((raw, i) => {
    const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!word) return;
    const sentenceStart = i === 0 || /[.!?…]["')\]]*$/.test(tokens[i - 1]);
    if (/\p{L}\.\p{L}/u.test(word) || (!sentenceStart && /^\p{Lu}/u.test(word) && word !== word.toUpperCase())) out.push(word);
  });
  return [...new Set(out)];
}

/** Length: a translation that lost much more than its silent start and end is worth a look. */
export function lengthCheck(sourceSeconds: number, finalSeconds: number, spokenEnd: number | null): QualityCheck {
  const kept = sourceSeconds > 0 ? finalSeconds / sourceSeconds : 1;
  const afterSpeech = spokenEnd !== null ? finalSeconds - spokenEnd : null;
  if (afterSpeech !== null && afterSpeech < -0.2) return { key: "length", label: CHECK_LABELS.length, status: "fail", detail: `The video ends ${Math.abs(afterSpeech).toFixed(1)} s before the voice does.` };
  if (kept < 0.6) return { key: "length", label: CHECK_LABELS.length, status: "warn", detail: `The video is ${Math.round(finalSeconds)} s of a ${Math.round(sourceSeconds)} s source: much was cut as silence.` };
  return { key: "length", label: CHECK_LABELS.length, status: "pass", detail: `${finalSeconds.toFixed(1)} s of a ${sourceSeconds.toFixed(1)} s source.` };
}

/** A check that could not run (no source text, a service down) is shown, never counted. */
export function skipped(key: QualityCheckKey, reason: string): QualityCheck {
  return { key, label: CHECK_LABELS[key], status: "skipped", detail: reason };
}
