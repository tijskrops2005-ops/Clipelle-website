/**
 * Measured times, from our own runs. Shown on the site as "measured"; a missing value is shown as
 * "not measured yet", never as a guess. Update from the project page after a real run.
 */
export const measured = {
  /** One translation run on 20 October 2026: an 8-second video into one language, about 5 minutes to ready. */
  translationMinutes: 5 as number | null,
  translationNote: "one measured run, an 8-second video into one language, 20 October 2026",
  /** No paid ad run has been timed yet. */
  adMinutes: null as number | null,
  adNote: "not measured yet; shown once the first timed run is done",
};
