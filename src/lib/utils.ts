/** Join class names, skipping falsy values. Tiny replacement for clsx. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Deterministic date formatting (fixed locale + time zone) so server and
 * client render the same string and the page can be prerendered.
 */
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}
