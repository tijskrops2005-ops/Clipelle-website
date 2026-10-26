import { TRIAL, planPrice, type Currency, type Plan } from "@/lib/plans";

export type Interval = "monthly" | "annual";

/**
 * What the "You're upgrading to …" window shows before anyone leaves for Stripe (26 Oct 2026, after
 * Creatify's confirm step, our own words). Pure, so a test can check every number:
 * - "trial": the first subscription of a workspace that never had a trial: nothing today, TRIAL.credits
 *   now, the plan's price and credits with the first payment after TRIAL.days;
 * - "new": a first subscription without a trial: the price today, the credits once it is paid;
 * - "change": a current subscriber picks another plan or level: the billing portal confirms it and
 *   shows the exact amount (upgrades apply now without proration, downgrades at the renewal).
 */
export function planChange(input: { from: Plan; to: Plan; interval: Interval; currency: Currency; trialAvailable: boolean; hasSubscription: boolean; now?: Date }) {
  const { from, to, interval, currency } = input;
  const price = planPrice(to, currency);
  const amount = interval === "annual" ? price.annualTotal : price.monthly;
  const mode: "trial" | "new" | "change" = input.hasSubscription ? "change" : input.trialAvailable ? "trial" : "new";
  const trialEnds = mode === "trial" ? new Date((input.now ?? new Date()).getTime() + TRIAL.days * 86_400_000) : null;
  return {
    mode,
    from,
    to,
    interval,
    currency,
    /** The amount charged today, excluding VAT; null when the portal works it out (a plan change). */
    dueToday: mode === "trial" ? 0 : mode === "new" ? amount : null,
    /** The recurring price: per month, or the year's total on annual billing. */
    amount,
    trialEnds,
    trialCredits: mode === "trial" ? TRIAL.credits : null,
    creditsBefore: from.creditsPerMonth,
    creditsAfter: to.creditsPerMonth,
    direction: to.monthlyUsd > from.monthlyUsd ? ("upgrade" as const) : to.monthlyUsd < from.monthlyUsd ? ("downgrade" as const) : ("same" as const),
  };
}
export type PlanChange = ReturnType<typeof planChange>;
