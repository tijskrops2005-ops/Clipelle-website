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
