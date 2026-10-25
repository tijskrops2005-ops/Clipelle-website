/** Prints the pricing model numbers for docs/pricing-model.md. Run: npx tsx scripts/pricing-table.ts */
import { ALL_PLANS, CREDIT_COST_USD, CREDIT_RULES, FREE_CREDITS, MIN_MARGIN, TOPUPS, adCreditTable, planMargin, translateCredits, usdPerTranslateMinute } from "../src/lib/plans";
import { estimateAdCost, estimateTranslateCost, DEFAULTS } from "../src/lib/pricing";

console.log(JSON.stringify({
  creditCostUsd: CREDIT_COST_USD,
  rules: CREDIT_RULES,
  minMargin: MIN_MARGIN,
  freeCredits: FREE_CREDITS,
  plans: ALL_PLANS.filter((p) => p.creditsPerMonth > 0).map((p) => ({ key: p.key, monthlyUsd: p.monthlyUsd, annualMonthlyUsd: p.annualMonthlyUsd, credits: p.creditsPerMonth, minutes: p.creditsPerMonth / 60, usdPerMinute: usdPerTranslateMinute(p), worstCaseMargin: planMargin(p) })),
  topups: TOPUPS.map((t) => ({ ...t, minutes: t.credits / 60, worstCaseMultiple: Math.round((t.usd / (t.credits * CREDIT_COST_USD)) * 100) / 100 })),
  adTable: adCreditTable().map((r) => ({ ...r, standardUsd: estimateAdCost({ seconds: r.seconds, clipModel: DEFAULTS.clipModel, engine: "avatar_iii" }).total, premiumUsd: estimateAdCost({ seconds: r.seconds, clipModel: DEFAULTS.clipModel, engine: "avatar_iv" }).total })),
  translatePerMinute: { speed: translateCredits({ seconds: 60, quality: "speed", enhance: false }), speedUsd: estimateTranslateCost({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }).perLanguageTotal, precision: translateCredits({ seconds: 60, quality: "precision", enhance: false }), precisionUsd: estimateTranslateCost({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }).perLanguageTotal },
}, null, 1));
