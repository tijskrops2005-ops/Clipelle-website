import { CREDIT_RULES, PLAN_MINUTES, type Plan, type TopupPack } from "@/lib/plans";

/**
 * The line under each product on the Stripe Checkout page (26 Oct 2026): what a customer gets, in
 * credits and minutes, in our own words. scripts/stripe-setup.ts writes it as the product description.
 */
export function planDescription(plan: Plan) {
  const minutes = PLAN_MINUTES[plan.key as keyof typeof PLAN_MINUTES];
  const amount = minutes ? `${minutes} minutes of translated video a month (${plan.creditsPerMonth.toLocaleString("en-US")} credits)` : `${plan.creditsPerMonth.toLocaleString("en-US")} credits a month`;
  return `${amount}. 1 credit = 1 second of translated video; an ad uses ${CREDIT_RULES.ad.avatar_iii} per second. Credits never expire.`;
}

export function packDescription(pack: TopupPack) {
  return `${pack.credits.toLocaleString("en-US")} credits on top of your plan. 1 credit = 1 second of translated video; an ad uses ${CREDIT_RULES.ad.avatar_iii} per second. Credits never expire.`;
}
