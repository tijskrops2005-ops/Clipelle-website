/**
 * "Real output": one real, unedited result shown on the homepage and the platform pages. Every
 * field is filled from a real run or left empty; an empty field shows "Sample coming soon".
 * Never a staged or edited example. Tijs fills this in from the project page of a real run.
 */
export type RealOutput = {
  /** File name in the examples bucket / public/examples (the finished video, as downloaded). */
  videoFile?: string;
  /** The product photo that went in (same places), if we may show it. */
  photoFile?: string;
  /** The spoken script exactly as the presenter said it. */
  script?: string;
  /** The real amount the project page showed afterwards, in US dollars. */
  costUsd?: number;
  /** Credits the project page showed. */
  credits?: number;
  /** Wall-clock time from Generate to ready, in seconds, as measured on the project page. */
  durationSeconds?: number;
  /** Length, quality, language as chosen on the form. */
  settings?: string;
  /** Date of the run. */
  madeOn?: string;
};

export const realAd: RealOutput = {
  videoFile: "ad-dress-30s-standard.mp4",
  settings: "30 s · Dutch · Standard presenter",
  madeOn: "2026-10-20",
};

export const realTranslation: RealOutput = {
  videoFile: "translate-senvia-nl.mp4",
  settings: "8 s · English to Dutch · Speed · captions",
  durationSeconds: 300,
  madeOn: "2026-10-20",
};
