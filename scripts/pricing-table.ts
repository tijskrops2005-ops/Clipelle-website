/** Prints the pricing model numbers for docs/pricing-model.md. Run: npx tsx scripts/pricing-table.ts */
import { CREDIT_COST_USD, FREE_AD_CREDITS, PLANS, SUBSCRIPTION_MARGIN, TOPUPS, TOPUP_MARGIN, adCreditTable, planMargin, translateCredits } from "../src/lib/plans";
import { estimateAdCost, estimateTranslateCost, DEFAULTS } from "../src/lib/pricing";

console.log(JSON.stringify({
  creditCostUsd: CREDIT_COST_USD,
  margins: { subscription: SUBSCRIPTION_MARGIN, topup: TOPUP_MARGIN },
  freeAdCredits: FREE_AD_CREDITS,
  plans: PLANS.map((p) => ({ key: p.key, monthlyUsd: p.monthlyUsd, annualMonthlyUsd: p.annualMonthlyUsd, credits: p.creditsPerMonth, margin: planMargin(p) })),
  topups: TOPUPS.map((t) => ({ ...t, costUsd: Math.round(t.credits * CREDIT_COST_USD * 100) / 100 })),
  adTable: adCreditTable().map((r) => ({ ...r, standardUsd: estimateAdCost({ seconds: r.seconds, clipModel: DEFAULTS.clipModel, engine: "avatar_iii" }).total, premiumUsd: estimateAdCost({ seconds: r.seconds, clipModel: DEFAULTS.clipModel, engine: "avatar_iv" }).total })),
  translatePerMinute: { speed: translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }), speedUsd: estimateTranslateCost({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }).perLanguageTotal, precision: translateCredits({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }), precisionUsd: estimateTranslateCost({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }).perLanguageTotal },
}, null, 1));
