/**
 * The translation shown at the top of the homepage: one real run ("Senvia", 19 October 2026), the
 * original next to the result. The original is the uploaded video (labelled "Original", never
 * "made with Clipelle"); the result is our output. Lines are the checked Dutch captions of that run.
 * Files live in the examples bucket and in public/examples/ (see src/lib/examples.ts).
 */
export const translationShowcase = {
  original: { file: "translate-senvia-original.mp4", poster: "translate-senvia-original.jpg", language: { en: "English", nl: "Engels" }, code: "EN" },
  result: { file: "translate-senvia-nl.mp4", poster: "translate-senvia-nl.jpg", language: { en: "Dutch", nl: "Nederlands" }, code: "NL" },
  lines: ["Mijn dokter zei al jaren: doe Kegels.", "Ik deed ze al die tijd verkeerd."],
  /** Seconds of the source video and minutes to ready, as measured on that run. */
  seconds: 8,
};

