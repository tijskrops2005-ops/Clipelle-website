import "server-only";
import { cacheLife } from "next/cache";
import { adCreditTable } from "@/lib/plans";

/**
 * The credit table the static site pages show. Clip prices carry a promo end date, so the numbers
 * depend on today's date; Next refuses `new Date()` inside a static prerender. This cache computes
 * the table once and refreshes it every hour, so a price change (the promo ending) shows within
 * the hour while the pages stay static. The forms and the cost guard keep using the live functions.
 */
export async function cachedAdCreditTable() {
  "use cache";
  cacheLife("hours");
  return adCreditTable();
}
