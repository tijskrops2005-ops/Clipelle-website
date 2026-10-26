import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, TRIAL, currencyFor, formatMoney, planLevels, planPrice } from "@/lib/plans";
import { ALL_SUBSCRIPTIONS, annualTotals, featureSteps } from "@/lib/pricingHelpers";
import { localizePath, type Locale } from "@/lib/i18n";
import { dict } from "@/content/i18n";
import { PricingCards, type PreviewCard } from "@/components/site/PricingCards";

/**
 * The homepage pricing block (25 Oct 2026, card layout after goteampulse.io, our own words and
 * numbers): Free and the three paid plans with a monthly/annual switch; since 26 Oct 2026 each paid
 * card has a credits dropdown (its three levels), the trial button (terms once under the switch)
 * and the locked features of the next plan, as on /pricing. Every price, credit
 * count and saving comes from plans.ts (dollars on /, euros on /nl); the words come from the
 * dictionary. The full page is /pricing.
 */
export function PricingPreview({ className, locale = "en" }: { className?: string; locale?: Locale }) {
  const t = dict(locale);
  const p = t.pricingPreview;
  const L = (x: string) => localizePath(x, locale);
  const currency = currencyFor(locale);
  const money = (v: number) => formatMoney(v, currency, locale);
  const shown = PLANS.filter((plan) => plan.key !== "enterprise");
  const cards: PreviewCard[] = shown.map((plan) => {
    const words = t.pricing.plans[plan.key as keyof typeof t.pricing.plans];
    const paid = plan.monthlyUsd > 0;
    const steps = featureSteps(plan.family);
    return {
      key: plan.key,
      name: plan.name,
      tagline: words?.tagline ?? plan.tagline,
      // Each credit level of the plan, with its own price, credits and trial terms (Free has one).
      levels: planLevels(plan.family).map((level) => {
        const totals = annualTotals(level, currency);
        const price = planPrice(level, currency);
        return {
          key: level.key,
          label: paid ? t.pricing.creditsOption.replace("{n}", level.creditsPerMonth.toLocaleString(locale === "nl" ? "nl-NL" : "en-US")) : t.pricing.plans.free.creditsNote,
          monthly: money(price.monthly),
          annual: money(price.annualMonthly),
          // One short line under the price on every card, so the buttons line up.
          annualNote: paid ? t.pricing.aYear.replace("{year}", money(totals.yearUsd)).replace("{saving}", money(totals.savingUsd)) : t.pricing.trial.noCard,
          monthlyNote: paid ? t.pricing.billedMonthly : t.pricing.trial.noCard,
        };
      }),
      everythingIn: steps.previous ? `${t.pricing.everythingIn.replace("{name}", steps.previous)}:` : null,
      features: [...steps.added.map((f) => t.pricing.features[f]), ...(words?.bullets ?? plan.bullets), ...(paid ? [p.packs] : [])],
      locked: steps.locked.map((f) => ({ text: t.pricing.features[f], plan: t.pricing.availableIn.replace("{plan}", steps.next ?? "") })),
      recommended: Boolean(plan.recommended),
      cta: paid ? t.pricing.trial.cta.replace("{n}", String(TRIAL.days)) : t.common.startFree,
      paid,
    };
  });
  const savePct = Math.max(...ALL_SUBSCRIPTIONS.map((plan) => annualTotals(plan, currency).savingPct));
  return (
    <div className={cn(className)}>
      <PricingCards
        cards={cards}
        currency={currency}
        labels={{ monthly: p.monthly, annual: p.annual, save: p.save.replace("{n}", String(savePct)), billingLabel: p.billingLabel, perMonth: p.perMonth, recommendation: p.recommendation, level: t.pricing.level, terms: t.pricing.trial.terms.replace("{n}", String(TRIAL.days)).replace("{zero}", money(0)) }}
      />
      <p className="mt-8 text-center text-[15px] text-muted">
        <Link href={L("/pricing")} className="focus-ring inline-flex items-center gap-1 rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">{p.compare} <ArrowRight className="size-4" aria-hidden /></Link>
      </p>
    </div>
  );
}
