/**
 * Measured times, from our own runs. Shown on the site as "measured"; a missing value is shown as
 * "not measured yet", never as a guess. Update from the project page after a real run.
 * Source of the values below: the steps' start and finish times in the database (23 Oct 2026 check).
 */
export const measured = {
  /** "Senvia", 19 October 2026: an 8-second video into one language, 271 s from first step to ready. */
  translationMinutes: 4.5 as number | null,
  translationNote: "one measured run, an 8-second video into one language, 19 October 2026",
  /** "Gracewear London", 19 October 2026: a 30-second Standard ad, 356 s from first step to ready. */
  adMinutes: 6 as number | null,
  adNote: "one measured run, a 30-second Standard ad, 19 October 2026",
};

/**
 * Expected seconds per stage of a translation, for the progress bar on the project page (27 Oct
 * 2026): `base + perSecond × source seconds`. Calibrated on the measured run above (an 8-second
 * video, 271 s in all) and the step times in the database; the bar never claims to be exact and
 * says "taking a little longer" when a stage runs past 1.5× its expectation.
 */
export const translateStages = {
  upload: { base: 8, perSecond: 0.2 },
  removeText: { base: 60, perSecond: 2 },
  translate: { base: 45, perSecond: 1.6 },
  voice: { base: 60, perSecond: 2 },
  enhance: { base: 40, perSecond: 3 },
  captions: { base: 40, perSecond: 1 },
} as const;

/**
 * Re-calibrated on 2 Nov 2026 from five finished translations on the live site (24–31 s videos, one
 * language, text removal on for four of them; docs/speed.md): upload incl. text removal median 122 s,
 * translate (proofread + check) 99 s, voice + captions 151 s, 446 s from start to ready (p90 651 s).
 */
export const measuredTranslateRun = { medianSeconds: 446, p90Seconds: 651, runs: 5, measuredOn: "2026-11-02" } as const;
