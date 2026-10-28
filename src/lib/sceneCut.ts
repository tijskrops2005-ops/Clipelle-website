/**
 * Is the silent end a new picture? (28 Oct 2026, Tijs: "knippen vóór een scènewissel".) Tested on real
 * endings: an ad often fades to its end card while the speaker is still talking, so cutting before
 * the change would cut words; and "remove silence" used to cut a customer's silent end card or outro.
 * So the silent end, plus the last second of speech, is rendered as a tiny GIF; each frame becomes a
 * small greyscale grid. When the picture changes there (a cut, a fade to an end card), the end is
 * kept; when it stays the speaking scene, it is dead air and is cut as before. A speaker who moves
 * changes the grid a little from frame to frame; a cut changes it a lot at once, a fade drifts far
 * from the first frame. Pure, tested.
 */

/** Mean absolute difference of two greyscale grids of the same size, 0–255. */
export function frameDiff(a: ArrayLike<number>, b: ArrayLike<number>) {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

export type ChangeOptions = { hardCut?: number; drift?: number };

/**
 * Index of the first frame that belongs to a new scene or a transition, or null when the picture
 * stays the same scene. `hardCut`: a jump between two frames; `drift`: how far a frame may move away
 * from the first frame (a slow fade). Both are raised when the speaker moves a lot anyway.
 */
export function firstChange(frames: ArrayLike<number>[], opts: ChangeOptions = {}): number | null {
  if (frames.length < 3) return null;
  const steps = frames.slice(1).map((f, i) => frameDiff(f, frames[i]));
  // How much the picture moves while it is still the same scene: the first third of the window.
  const early = steps.slice(0, Math.max(2, Math.floor(steps.length / 3))).sort((a, b) => a - b);
  const calm = early[Math.floor(early.length / 2)] ?? 0;
  const hardCut = Math.max(opts.hardCut ?? 22, calm * 5);
  const drift = Math.max(opts.drift ?? 38, calm * 8);
  for (let i = 1; i < frames.length; i++) {
    if (steps[i - 1] > hardCut || frameDiff(frames[i], frames[0]) > drift) return i;
  }
  return null;
}
