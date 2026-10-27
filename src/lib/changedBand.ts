/**
 * Where did the text removal change the picture? (27 Oct 2026) The same frame of the source and of the
 * cleaned video differ only where text was removed, so the changed pixels mark the smudge exactly; a
 * guess from a vision model was off by up to 6% of the frame height. Pure and browser-safe: it takes
 * two greyscale images of the same size (one byte per pixel) and returns a box as fractions.
 */
export type Band = { top: number; bottom: number; left: number; right: number };

const PIXEL_DIFF = 28;
const HOT_ROW = 0.08;
const HOT_COLUMN = 0.15;
const MAX_HEIGHT = 0.25;

export function changedBand(a: ArrayLike<number>, b: ArrayLike<number>, width: number, height: number): Band | null {
  if (a.length < width * height || b.length < width * height) return null;
  const changed = new Uint8Array(width * height);
  const rows: number[] = [];
  for (let y = 0; y < height; y++) {
    let n = 0;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (Math.abs(a[i] - b[i]) > PIXEL_DIFF) {
        changed[i] = 1;
        n++;
      }
    }
    rows.push(n / width);
  }
  // Runs of changed rows (gaps of two rows or less are bridged); the strongest run that is not most of the frame wins.
  let best: { from: number; to: number; score: number } | null = null;
  let from = -1;
  let last = -1;
  let score = 0;
  const close = () => {
    if (from < 0) return;
    const h = last - from + 1;
    if (h >= Math.max(2, height * 0.01) && h <= height * MAX_HEIGHT && (!best || score > best.score)) best = { from, to: last, score };
    from = -1;
    score = 0;
  };
  for (let y = 0; y < height; y++) {
    if (rows[y] <= HOT_ROW) continue;
    if (from >= 0 && y - last > 3) close();
    if (from < 0) from = y;
    last = y;
    score += rows[y];
  }
  close();
  if (!best) return null;
  const { from: top, to: bottom } = best as { from: number; to: number };
  let left = -1;
  let right = -1;
  for (let x = 0; x < width; x++) {
    let n = 0;
    for (let y = top; y <= bottom; y++) n += changed[y * width + x];
    if (n / (bottom - top + 1) > HOT_COLUMN) {
      if (left < 0) left = x;
      right = x;
    }
  }
  if (left < 0) return null;
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return { top: r(top / height), bottom: r((bottom + 1) / height), left: r(left / width), right: r((right + 1) / width) };
}

/**
 * One box from the bands of several moments: bands far from the others (a frame that did not line up,
 * so movement counted as change) are dropped, the rest are joined so the widest old line fits.
 */
export function joinBands(bands: (Band | null)[]): Band | null {
  const found = bands.filter((b): b is Band => b !== null);
  if (found.length === 0) return null;
  const centres = found.map((b) => (b.top + b.bottom) / 2).sort((x, y) => x - y);
  const median = centres[Math.floor(centres.length / 2)];
  const near = found.filter((b) => Math.abs((b.top + b.bottom) / 2 - median) <= 0.08);
  return {
    top: Math.min(...near.map((b) => b.top)),
    bottom: Math.max(...near.map((b) => b.bottom)),
    left: Math.min(...near.map((b) => b.left)),
    right: Math.max(...near.map((b) => b.right)),
  };
}
