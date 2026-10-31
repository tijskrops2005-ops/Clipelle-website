import "server-only";
import { cacheLife } from "next/cache";
import { activeListPrice, adCreditTable } from "@/lib/plans";
import { ALL_SUBSCRIPTIONS } from "@/lib/pricingHelpers";
import { defaultClipModel, estimateAdCost } from "@/lib/pricing";

/** Which plans show a struck-through launch price right now (a date check), refreshed every hour. */
export async function cachedListPrices(): Promise<Record<string, number | null>> {
  "use cache";
  cacheLife("hours");
  return Object.fromEntries(ALL_SUBSCRIPTIONS.map((p) => [p.key, activeListPrice(p)]));
}

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

/** The estimate of a 30 s Standard ad (what the ad form shows by default), refreshed every hour. */
export async function cachedStandardAdEstimate() {
  "use cache";
  cacheLife("hours");
  return estimateAdCost({ seconds: 30, clipModel: defaultClipModel(), engine: "avatar_iii" }).total;
}
