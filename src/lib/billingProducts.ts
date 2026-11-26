import { CREDIT_RULES, PLAN_MINUTES, type Plan, type TopupPack } from "@/lib/plans";

/**
 * The line under each product on the Stripe Checkout page (26 Oct 2026): what a customer gets, in
 * credits and minutes, in our own words. scripts/stripe-setup.ts writes it as the product description.
 * The ad rate is named only while ads are on (`NEXT_PUBLIC_ADS_ENABLED`, 26 Nov 2026): with ads
 * "coming soon" the checkout page talks about translation only.
 */
function rule(ads = process.env.NEXT_PUBLIC_ADS_ENABLED === "true") {
  return ads ? `1 credit = 1 second of translated video; an ad uses ${CREDIT_RULES.ad.avatar_iii} per second.` : "1 credit = 1 second of translated video.";
}

export function planDescription(plan: Plan, ads?: boolean) {
  const minutes = PLAN_MINUTES[plan.key as keyof typeof PLAN_MINUTES];
  const amount = minutes ? `${minutes} minutes of translated video a month (${plan.creditsPerMonth.toLocaleString("en-US")} credits)` : `${plan.creditsPerMonth.toLocaleString("en-US")} credits a month`;
  return `${amount}. ${rule(ads)} Credits never expire.`;
}

export function packDescription(pack: TopupPack, ads?: boolean) {
  return `${pack.credits.toLocaleString("en-US")} credits on top of your plan. ${rule(ads)} Credits never expire.`;
}

/** The per-credit product (any amount, bought with a quantity). */
export function creditUnitDescription(ads?: boolean) {
  return `One-off credits on top of your plan, any amount. ${rule(ads)} Credits never expire.`;
}
