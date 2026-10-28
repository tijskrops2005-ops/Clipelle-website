/**
 * Short caption chunks (27 Oct 2026, after a test where one 13-second line showed as a 4-line block):
 * every line is cut into pieces of a few words, at most two caption lines, breaking after a sentence
 * end where it can; each piece gets a share of the line's time by its length. Display only: the voice
 * follows the full lines. Pure and browser-safe.
 */
export type Cue = { index: number; start: number; end: number; text: string };

/** Characters per chunk by caption size: about two lines on a 1080-wide frame (a 900 px caption box). */
export const CHUNK_CHARS: Record<"small" | "medium" | "large", number> = { small: 40, medium: 32, large: 26 };

/**
 * Characters per chunk for the real caption box (28 Oct 2026): the bar over removed text is narrower
 * than 900 px, and a chunk sized for 900 px overflowed it, so the edit service shrank that one caption.
 */
export function chunkCharsFor(size: "small" | "medium" | "large", boxWidthPx: number) {
  return Math.max(14, Math.round((CHUNK_CHARS[size] * boxWidthPx) / 900));
}

export function chunkCues(cues: Cue[], maxChars = CHUNK_CHARS.medium): Cue[] {
  const out: Cue[] = [];
  for (const cue of cues) {
    const words = cue.text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (words.length === 0) continue;
    const chunks: string[] = [];
    let current: string[] = [];
    const length = (ws: string[]) => ws.join(" ").length;
    for (const word of words) {
      const sentenceEnd = /[.!?…]$/.test(word);
      // The word that ends a sentence may run a little over (15%, still inside two lines), so the sentence ends in this chunk.
      if (current.length && length([...current, word]) > maxChars && !(sentenceEnd && length([...current, word]) <= maxChars + Math.round(maxChars * 0.15))) {
        chunks.push(current.join(" "));
        current = [];
      }
      current.push(word);
      // Break after a sentence end, or after a comma once the chunk is half full.
      if ((sentenceEnd && length(current) >= maxChars * 0.3) || (/[,;:]$/.test(word) && length(current) >= maxChars * 0.5)) {
        chunks.push(current.join(" "));
        current = [];
      }
    }
    if (current.length) {
      // A single short word left over joins the previous chunk when that still fits.
      const last = chunks[chunks.length - 1];
      if (last && current.length === 1 && (last + " " + current[0]).length <= maxChars + Math.round(maxChars * 0.15)) chunks[chunks.length - 1] = `${last} ${current[0]}`;
      else chunks.push(current.join(" "));
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    let t = cue.start;
    for (const [i, chunk] of chunks.entries()) {
      const end = i === chunks.length - 1 ? cue.end : t + ((cue.end - cue.start) * chunk.length) / total;
      out.push({ index: 0, start: Math.round(t * 1000) / 1000, end: Math.round(end * 1000) / 1000, text: chunk });
      t = end;
    }
  }
  return out.map((c, i) => ({ ...c, index: i + 1 }));
}

/**
 * Captions over removed text stay on screen from the first frame to the last (27 Oct 2026): between two
 * lines, and before the first and after the last, the cleaned spot showed for a moment. Each cue runs
 * on until the next one starts; the first starts at 0 and the last ends with the video.
 */
export function fillGaps(cues: Cue[], totalSeconds: number): Cue[] {
  const sorted = [...cues].sort((a, b) => a.start - b.start);
  return sorted.map((c, i) => ({
    ...c,
    start: i === 0 ? 0 : c.start,
    end: i === sorted.length - 1 ? Math.max(c.end, totalSeconds) : sorted[i + 1].start,
  }));
}
