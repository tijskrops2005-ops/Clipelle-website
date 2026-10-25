/**
 * "Real output": one real, unedited result shown on the homepage and the platform pages. Every
 * field is filled from a real run or left empty; an empty input field is left out (25 Oct 2026).
 * Never a staged or edited example. Tijs fills this in from the project page of a real run.
 */
export type RealOutput = {
  /** File name in the examples bucket / public/examples (the finished video, as downloaded). */
  videoFile?: string;
  /** The product photo that went in (same places), if we may show it. */
  photoFile?: string;
  /** For a translation: the uploaded source video (same places). */
  sourceVideoFile?: string;
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

// Values from the database records of the two runs (project "Gracewear London" and "Senvia",
// both 19 October 2026): spoken script from the script step, cost from cost_entries, time from
// the first step's start to the last step's finish. The product photo stays empty until we know
// we may show it.
export const realAd: RealOutput = {
  videoFile: "ad-dress-30s-standard.mp4",
  script: "Opvallen op een diner, zonder overdreven te zijn? Je kent het: je kast hangt vol, maar niets voelt elegant genoeg voor een avond uit. Dit is Madison, een witte midi-jurk met lange mouwen. De asymmetrische hals valt meteen op. De plooien door het lijf geven vorm. En de pasvorm is gestructureerd, voor een verzorgde look. Perfect voor diners, feesten en speciale avonden. Tik op de link en bestel Madison vandaag.",
  costUsd: 0.53,
  durationSeconds: 356,
  settings: "30 s · Dutch · Standard presenter",
  madeOn: "2026-10-19",
};

export const realTranslation: RealOutput = {
  videoFile: "translate-senvia-nl.mp4",
  sourceVideoFile: "translate-senvia-original.mp4",
  // The checked Dutch lines of that run, as spoken in the result.
  script: "Mijn dokter zei al jaren: doe Kegels. Ik deed ze al die tijd verkeerd.",
  costUsd: 0.26,
  settings: "8 s · English to Dutch · Speed · captions",
  durationSeconds: 271,
  madeOn: "2026-10-19",
};
