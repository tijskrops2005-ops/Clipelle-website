/**
 * Annual plans (27 Oct 2026, Tijs): paid once a year (cheaper), credits every month like a monthly
 * plan. The paid annual invoice brings month 1; a daily job adds months 2 to 12 on the same day of
 * each following month. Every month is its own ledger grant with a reference, so a month is never
 * granted twice. Pure and browser-safe; the grants themselves live in src/lib/billing.ts.
 */
export const ANNUAL_MONTHS = 12;

export function annualReference(invoiceId: string, planKey: string, month: number) {
  return `annual:${invoiceId}:${planKey}:${month}`;
}

export function parseAnnualReference(reference: string | null | undefined): { invoiceId: string; planKey: string; month: number } | null {
  const m = /^annual:([^:]+):([^:]+):(\d+)$/.exec(reference ?? "");
  return m ? { invoiceId: m[1], planKey: m[2], month: Number(m[3]) } : null;
}

/** The same day `months` later; a day the month does not have becomes its last day (31 Jan + 1 = 28/29 Feb). */
export function addMonthsClamped(from: Date, months: number) {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth() + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(from.getUTCDate(), last), from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds()));
}

/** How many months of an annual period have started by `now` (1 to 12): month n starts n - 1 months after the payment. */
export function annualMonthsDue(paidAt: Date, now: Date) {
  let due = 0;
  for (let month = 1; month <= ANNUAL_MONTHS; month++) {
    if (addMonthsClamped(paidAt, month - 1).getTime() <= now.getTime()) due = month;
  }
  return due;
}
