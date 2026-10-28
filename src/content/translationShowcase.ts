/**
 * The translation shown at the top of the homepage: one real run (the gift story, 27 October 2026; was "Senvia" until 28 October), the
 * original next to the result. The original is the uploaded video (labelled "Original", never
 * "made with Clipelle"); the result is our output. Lines are the checked Dutch captions of that run.
 * Files live in the examples bucket and in public/examples/ (see src/lib/examples.ts).
 */
export const translationShowcase = {
  original: { file: "translate-coffee-gift-original.mp4", poster: "translate-coffee-gift-original.jpg", language: { en: "English", nl: "Engels" }, code: "EN" },
  result: { file: "translate-coffee-gift-nl.mp4", poster: "translate-coffee-gift-nl.jpg", language: { en: "Dutch", nl: "Nederlands" }, code: "NL" },
  lines: ["Mijn moeder is stiekem een beetje boos op me,", "omdat ik mijn vader de Coffee Special Deal Ritual Set heb gegeven."],
  /** Seconds of the source video. */
  seconds: 11,
};
