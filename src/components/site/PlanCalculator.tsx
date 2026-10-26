"use client";

import { useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { adCredits, formatMoney, planPrice, translateCredits, TRIAL, type Currency } from "@/lib/plans";
import { planFit } from "@/lib/pricingHelpers";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * "Which plan fits?" (26 Oct 2026): the one calculator on /pricing, replacing the credit table, the
 * plan finder and the do-it-yourself comparison there (Tijs: too busy). Two sliders and one switch;
 * the answer is the smallest plan or level that covers the month and has the needed features
 * (planFit), with its real price. No per-video money estimates, no packs as a monthly cost.
 */
export function PlanCalculator({ locale = "en", currency, annual }: { locale?: Locale; currency: Currency; annual: boolean }) {
  const t = dict(locale).pricing;
  const c = t.calc;
  const [minutes, setMinutes] = useState(10);
  const [ads, setAds] = useState(5);
  const [premium, setPremium] = useState(false);
  const fmt = (n: number) => n.toLocaleString(locale === "nl" ? "nl-NL" : "en-US");

  const r = useMemo(() => {
    const perMinute = translateCredits({ seconds: 60, quality: premium ? "precision" : "speed", enhance: false });
    const perAd = adCredits({ seconds: 30, engine: premium ? "avatar_iv" : "avatar_iii" });
    const credits = minutes * perMinute + ads * perAd;
    const fit = planFit(credits, 0, undefined, currency, premium ? ["premium", "precision"] : []);
    return { credits, fit };
  }, [minutes, ads, premium, currency]);

  const plan = r.fit.plan;
  const price = plan ? planPrice(plan, currency) : null;
  const tooBig = r.fit.withPacks;
  const fitsFree = r.credits <= 30 && !premium;
  const href = plan && !fitsFree ? `/signup?next=${encodeURIComponent(`/settings/billing?plan=${plan.key}&interval=${annual ? "annual" : "monthly"}${currency === "eur" ? "&currency=eur" : ""}`)}` : "/signup";
  const used = plan ? Math.min(100, Math.round((r.credits / plan.creditsPerMonth) * 100)) : 0;

  return (
    <section>
      <h3 className="text-title text-center">{c.title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-center text-[15px] text-muted">{c.text}</p>
      <div className="mx-auto mt-8 grid max-w-4xl gap-5 rounded-card bg-surface p-6 shadow-card sm:p-7 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Slider id="calc-min" label={c.minutes} value={minutes} min={0} max={240} step={5} onChange={setMinutes} display={`${minutes} min`} />
          <Slider id="calc-ads" label={c.ads} value={ads} min={0} max={60} step={1} onChange={setAds} display={String(ads)} />
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-ink">{c.premium}</span>
              <span className="block text-[13px] text-muted">{c.premiumNote}</span>
            </span>
            <button type="button" role="switch" aria-checked={premium} onClick={() => setPremium((p) => !p)} className={cn("focus-ring relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200", premium ? "bg-ink" : "bg-divider")}>
              <span className={cn("absolute left-1 top-1 size-5 rounded-full bg-surface shadow-soft transition-transform duration-200 motion-reduce:transition-none", premium && "translate-x-5")} />
              <span className="sr-only">{c.premium}</span>
            </button>
          </label>
        </div>
        <div className="flex flex-col rounded-panel bg-surface-muted p-5" aria-live="polite">
          <p className="text-[13px] text-muted">{c.needed}</p>
          <p className="mt-1 flex items-center gap-2 text-[32px] font-semibold leading-none tracking-[-0.03em] text-ink" style={{ fontVariantNumeric: "tabular-nums" }}><Coins className="size-6 text-accent" aria-hidden />{fmt(r.credits)}</p>
          <div className="mt-5 border-t border-divider pt-4">
            <p className="text-[13px] text-muted">{c.fits}</p>
            {fitsFree ? (
              <p className="mt-1 text-[17px] font-semibold text-ink">{c.free}</p>
            ) : tooBig ? (
              <p className="mt-1 text-[17px] font-semibold text-ink">{c.beyond}</p>
            ) : plan && price ? (
              <>
                <p className="mt-1 text-[20px] font-semibold text-ink">{plan.name} <span className="text-[15px] font-medium text-muted">· {t.creditsOption.replace("{n}", fmt(plan.creditsPerMonth))}</span></p>
                <p className="text-[15px] text-ink">{formatMoney(annual ? price.annualMonthly : price.monthly, currency, locale)}{t.perMonth}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-divider" aria-hidden><div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${used}%` }} /></div>
                <p className="mt-1.5 text-[12.5px] text-muted">{c.spare.replace("{n}", fmt(plan.creditsPerMonth - r.credits))}</p>
              </>
            ) : null}
          </div>
          <div className="mt-auto pt-5">
            {tooBig ? (
              <Button href={locale === "nl" ? "/nl/demo" : "/demo"} variant="primary" className="w-full">{dict(locale).common.contactSales}</Button>
            ) : (
              <Button href={href} variant="accent" className="w-full">{fitsFree ? c.start : t.trial.cta.replace("{n}", String(TRIAL.days))}</Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Slider({ id, label, value, min, max, step, onChange, display }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        <output htmlFor={id} className="text-sm font-semibold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>{display}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-accent" />
    </div>
  );
}
