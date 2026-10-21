import type { FaqItem } from "./faq";
import { CREDIT_EXPIRY } from "@/lib/plans";

/** FAQ on /pricing, in our own words and true today (FAQPage schema on the page). */
export const pricingFaq: FaqItem[] = [
  { q: "What is the free ad?", a: `One 10-second ad with the Standard presenter after you verify your e-mail. No card. It expires ${CREDIT_EXPIRY.freeAdDays} days after it is granted.` },
  { q: "How do credits work, and do they expire?", a: "One credit is one second of Standard presenter video; every form shows the credits for your choices before you start, and the project page shows what was really used. Credits from a subscription or a pack never expire while your account exists, also after you cancel. Deleting your account forfeits them." },
  { q: "What are teams and members?", a: "A team workspace shares one credit pool. The Owner manages the plan, credits and members; Members make and see the team's projects. There is no cost per seat; the Business plan is per workspace." },
  { q: "Can I change or cancel my plan?", a: "Yes, any time in Billing through the customer portal. A change applies from the next period; cancelling keeps the plan active until the end of the period you paid for, and your credits stay." },
  { q: "Who owns the videos?", a: "You do. Use them wherever you like. For translations you confirm first that you own the source video and have the speaker's permission." },
  { q: "Do you refund?", a: "The terms draft says what applies: a project that fails is refunded in credits automatically. Refunds of payments are handled case by case through the contact form while the terms are in review." },
  { q: "Which links and languages are supported?", a: "URL to video reads public product pages with product data, sharing tags or a title and photos. Ads can be spoken in the languages that have presenter voices; translations support 190 languages and regional variants." },
  { q: "Is the API included?", a: "Yes, on every plan with credits. Keys are made in Settings → API keys and use the same credits and limits as the form. There is also an MCP server for assistants." },
  { q: "What is the managed service?", a: "We run Reelay for you: products in, finished ads out, scripts reviewed by a person. Scope and price are agreed per brand on a call; there is no fixed offer on this page." },
];
