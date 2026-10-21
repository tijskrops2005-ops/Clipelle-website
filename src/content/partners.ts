/**
 * Partner program (/partners). The program runs on an external partner platform (Reditus). Fill in
 * `signupUrl` with the application link from that platform; while it is empty the page says
 * "Partner program opens soon" and shows a contact link instead of the button.
 * The commission rules are the agreed ones and the only ones; do not add details that were not decided.
 */
export const partners = {
  signupUrl: "",
  platformName: "Reditus",
  /** Percent of every subscription payment of a referred customer, for as long as they keep a subscription. */
  commissionPercent: 25,
  /** No commission on separately purchased credit packs. */
  creditPacksCommission: false,
  payout: "monthly" as const,
  minimumPayoutUsd: 50,
};
