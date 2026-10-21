import type { LegalDoc } from "./types";

/**
 * Partner program terms. The commission rules below are the agreed ones (21 October 2026) and the
 * only ones: 25% on subscription payments, no commission on credit packs, monthly payout with a
 * $50 minimum, lifetime as long as the referred customer keeps a subscription, paid through the
 * external partner platform. Add nothing that has not been decided.
 */
export const affiliateTermsDoc: LegalDoc = {
  slug: "affiliate-terms",
  title: "Partner program terms",
  summary: "The commission rules of the Reelay partner program.",
  updated: "2026-10-21",
  draft: true,
  sections: [
    { heading: "Commission", bullets: ["A partner receives 25% commission on the subscription payments of every customer they referred.", "The commission applies for as long as that customer keeps a subscription.", "No commission is paid on separately purchased credit packs."] },
    { heading: "Payout", bullets: ["Commissions are paid out monthly.", "The minimum payout is 50 US dollars; smaller balances carry over to the next month.", "Payouts are made through the external partner platform the program runs on; the partner's details and payout method are managed there."] },
    { heading: "Referrals", bullets: ["A referral stays active as long as the referred customer keeps a subscription."] },
    { heading: "Draft", paragraphs: ["This is a draft of the program terms. The final wording follows after review; the commission rules above will not change in that review."] },
  ],
};
