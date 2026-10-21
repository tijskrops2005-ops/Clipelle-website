/**
 * The managed service ("Winning ads, made for you", /services/done-for-you). Volumes, turnaround
 * and what is included come ONLY from here; while a field is empty the page shows no number or
 * time for it. No price is shown anywhere: the page points to Book a demo and the request form.
 */
export const services = {
  /** e.g. "10 to 40 ads per month". Empty = not shown. */
  volumeRange: "",
  /** e.g. "First drafts within 5 working days". Empty = not shown. */
  turnaround: "",
  /** What the service includes, only once agreed. Empty = a generic description without promises. */
  features: [] as string[],
};
