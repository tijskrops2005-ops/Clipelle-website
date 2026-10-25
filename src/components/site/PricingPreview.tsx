import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, formatPrice } from "@/lib/plans";
import { annualTotals } from "@/lib/pricingHelpers";
import { localizePath, type Locale } from "@/lib/i18n";
import { dict } from "@/content/i18n";
import { PricingCards, type PreviewCard } from "@/components/site/PricingCards";

/** What Stripe charges per year, with a thousands separator ($1,590). */
const yearPrice = (usd: number) => `$${usd.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(usd) ? 0 : 2, maximumFractionDigits: 2 })}`;

/**
 * The homepage pricing block (25 Oct 2026, card layout after goteampulse.io, our own words and
 * numbers): Free and the three paid plans with a monthly/annual switch. Every price, credit
 * count and saving comes from plans.ts; the words come from the dictionary. The full page is /pricing.
 */
export function PricingPreview({ className, locale = "en" }: { className?: string; locale?: Locale }) {
  const t = dict(locale);
  const p = t.pricingPreview;
  const L = (x: string) => localizePath(x, locale);
  const shown = PLANS.filter((plan) => plan.key !== "enterprise");
  const cards: PreviewCard[] = shown.map((plan) => {
    const words = t.pricing.plans[plan.key as keyof typeof t.pricing.plans];
    const totals = annualTotals(plan);
    const paid = plan.monthlyUsd > 0;
    return {
      key: plan.key,
      name: plan.name,
      tagline: words?.tagline ?? plan.tagline,
      monthly: formatPrice(plan.monthlyUsd),
      annual: formatPrice(plan.annualMonthlyUsd),
      annualNote: paid ? p.billedAnnually.replace("{year}", yearPrice(totals.yearUsd)) : p.freeForever,
      monthlyNote: paid ? p.billedMonthly : p.freeForever,
      features: [
        // Free's own bullets already describe the free ad.
        ...(paid ? [`${plan.creditsPerMonth.toLocaleString("en-US")} ${p.creditsPerMonth}`] : []),
        ...(words?.bullets ?? plan.bullets),
        ...(paid ? [p.api, p.packs] : []),
      ],
      recommended: Boolean(plan.recommended),
      cta: paid ? p.choose.replace("{name}", plan.name) : t.common.startFree,
      paid,
    };
  });
  const savePct = Math.max(...shown.map((plan) => annualTotals(plan).savingPct));
  return (
    <div className={cn(className)}>
      <PricingCards
        cards={cards}
        labels={{ monthly: p.monthly, annual: p.annual, save: p.save.replace("{n}", String(savePct)), billingLabel: p.billingLabel, perMonth: p.perMonth, recommendation: p.recommendation }}
      />
      <p className="mt-8 text-center text-[15px] text-muted">
        <Link href={L("/pricing")} className="focus-ring inline-flex items-center gap-1 rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">{p.compare} <ArrowRight className="size-4" aria-hidden /></Link>
      </p>
    </div>
  );
}
