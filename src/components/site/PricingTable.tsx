"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowRight, Building2, Check, ChevronDown, Lock, Minus, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { BillingSwitch } from "@/components/ui/BillingSwitch";
import { CreditsSelect } from "@/components/ui/CreditsSelect";
import { CreditsSlider } from "./CreditsSlider";
import { PlanCalculator } from "./PlanCalculator";
import { CREDIT_EXPIRY, PLANS, TRIAL, activeListPrice, adCreditTable, currencyFor, formatMoney, hasFeature, planByKey, planFamily, planLevels, planPrice, translateCredits, type Currency, type Plan, type PlanFamily, type PlanKey } from "@/lib/plans";
import { ALL_SUBSCRIPTIONS, annualTotals, featureSteps, usdPerCredit } from "@/lib/pricingHelpers";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

type Interval = "monthly" | "annual";
type Tab = "individual" | "business" | "api";

/**
 * The pricing page body: tabs Individual / Business / API, a monthly-annual switch with the real
 * saving, plan cards (26 Oct 2026: three credit levels per plan, a credits pill, the trial button with
 * its terms, "Everything in X, plus" and locked features of the next plan), credit packs, a dark
 * Enterprise / done-for-you band, a folded comparison table and the plan finder.
 * Every number comes from plans.ts and pricing.ts. `compact` (Billing settings) shows the cards only.
 * Prices are in dollars on / and in euros on /nl; Billing passes the currency the customer picked.
 */
export function PricingTable({ onChoose, busyKey, compact, locale = "en", currency = currencyFor(locale), trial = true, initialPlan, currentPlan }: { onChoose?: (plan: Plan, interval: Interval) => void; busyKey?: string | null; compact?: boolean; locale?: Locale; currency?: Currency; /** Show the free-trial button and terms (the site always; Billing only while the workspace can still start one). */ trial?: boolean; /** Preselect this plan's level (a `?plan=` link). */ initialPlan?: string | null; /** Billing: the workspace's plan, marked "Current plan". */ currentPlan?: string | null }) {
  const t = dict(locale).pricing;
  const m: Money = { currency, locale };
  const billingHref = (key: string, interval: Interval) => `/signup?next=${encodeURIComponent(`/settings/billing?plan=${key}&interval=${interval}${currency === "eur" ? "&currency=eur" : ""}`)}`;
  const L = (p: string) => localizePath(p, locale);
  const [annual, setAnnual] = useState(true);
  const interval: Interval = annual ? "annual" : "monthly";
  const initial = planByKey(initialPlan);
  const [tab, setTab] = useState<Tab>(initial?.family === "business" ? "business" : "individual");
  // The chosen level per plan (Starter, Pro, Scale, Business); the base level until someone picks.
  const [levels, setLevels] = useState<Partial<Record<PlanFamily, PlanKey>>>(() => (initial && initial.family !== "free" ? { [initial.family]: initial.key } : {}));
  const pick = (family: PlanFamily) => planByKey(levels[family]) ?? planLevels(family)[0];
  const setLevel = (family: PlanFamily) => (key: string) => setLevels((l) => ({ ...l, [family]: key as PlanKey }));
  const [packCredits, setPackCredits] = useState(500);
  const base = useId();
  const families = ["starter", "pro", "scale"] as const;
  const free = PLANS.find((p) => p.key === "free")!;
  const business = pick("business");
  const maxSaving = useMemo(() => Math.max(...ALL_SUBSCRIPTIONS.map((p) => annualTotals(p, currency).savingPct)), [currency]);
  const trialLabel = t.trial.cta.replace("{n}", String(TRIAL.days));
  const ctaFor = (p: Plan, fallback: string) => (onChoose ? (busyKey === p.key ? t.openingCheckout : trial ? trialLabel : fallback) : trialLabel);
  const p = dict(locale).pricingPreview;

  const tabs: { key: Tab; label: string }[] = [{ key: "individual", label: t.tabs.individual }, { key: "business", label: t.tabs.business }, { key: "api", label: t.tabs.api }];

  return (
    <div className={cn("@container", compact ? "space-y-8" : "space-y-16")}>
      <div className="flex flex-col items-center gap-5">
        <div role="tablist" aria-label={t.tabs.ariaLabel} className="inline-flex gap-1 rounded-full bg-surface-muted p-1" onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const i = tabs.findIndex((t) => t.key === tab);
          const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          setTab(next.key);
          document.getElementById(`${base}-tab-${next.key}`)?.focus();
        }}>
          {tabs.map((t) => (
            <button key={t.key} id={`${base}-tab-${t.key}`} role="tab" type="button" aria-selected={tab === t.key} aria-controls={`${base}-panel-${t.key}`} tabIndex={tab === t.key ? 0 : -1} onClick={() => setTab(t.key)} className={cn("focus-ring h-10 rounded-full px-5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150", tab === t.key ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}>{t.label}</button>
          ))}
        </div>
        {tab !== "api" && (
          <div className="flex flex-col items-center gap-2.5">
            <BillingSwitch annual={annual} onChange={setAnnual} labels={{ monthly: t.period.monthly, annual: p.annual, save: p.save.replace("{n}", String(maxSaving)), billingLabel: p.billingLabel }} />
            <p className="text-center text-[13px] text-muted">{trial ? `${t.trial.terms.replace("{n}", String(TRIAL.days)).replace("{zero}", formatMoney(0, currency, locale))} ` : ""}{t.period.note}</p>
          </div>
        )}
      </div>

      <div id={`${base}-panel-individual`} role="tabpanel" aria-labelledby={`${base}-tab-individual`} hidden={tab !== "individual"} className={cn(tab === "individual" && "fold-in")}>
        {compact ? (
          // Billing (26 Oct 2026): plans as rows in a narrow column, no Free card; features stay on /pricing.
          <div className="divide-y divide-divider overflow-visible rounded-panel border border-border">
            {families.map((family) => {
              const plan = pick(family);
              const current = currentPlan === plan.key;
              return (
                <PlanRow key={family} plan={plan} interval={interval} t={t} m={m} onLevel={setLevel(family)} current={planFamily(currentPlan) === family}
                  cta={
                    onChoose ? (
                      <Button type="button" variant={planLevels(family)[0].recommended ? "accent" : "primary"} className="w-full" onClick={() => onChoose(plan, interval)} disabled={Boolean(busyKey) || current}>{current ? t.currentPlan : ctaFor(plan, t.choose.replace("{name}", plan.name))}</Button>
                    ) : (
                      <Button type="button" variant="secondary" className="w-full" disabled>{t.choose.replace("{name}", plan.name)}</Button>
                    )
                  } />
              );
            })}
          </div>
        ) : (
          <div className="grid gap-5 @2xl:grid-cols-2 @5xl:grid-cols-4">
            <PlanCard plan={free} interval={interval} t={t} m={m} cta={<Button href="/signup" variant="secondary" className="w-full">{t.startFree}</Button>} />
            {families.map((family) => {
              const plan = pick(family);
              const variant = planLevels(family)[0].recommended ? "accent" : "primary";
              return (
                <PlanCard key={family} plan={plan} interval={interval} t={t} m={m} onLevel={setLevel(family)}
                  cta={
                    onChoose ? (
                      <Button type="button" variant={variant} className="w-full" onClick={() => onChoose(plan, interval)} disabled={Boolean(busyKey)}>{ctaFor(plan, t.choose.replace("{name}", plan.name))}</Button>
                    ) : (
                      <Button href={billingHref(plan.key, interval)} variant={variant} className="w-full">{trialLabel}</Button>
                    )
                  } />
              );
            })}
          </div>
        )}
        {!compact && (
          <div className="mt-8 grid gap-6 rounded-card bg-surface p-6 shadow-card sm:p-7 @4xl:grid-cols-[1fr_1.4fr] @4xl:items-center">
            <div>
              <p className="text-[20px] font-semibold text-ink">{t.packs.title}</p>
              <p className="mt-1.5 text-[15px] text-muted">{t.packs.text}</p>
            </div>
            <div className="rounded-panel bg-surface-muted p-5">
              <CreditsSlider value={packCredits} onChange={setPackCredits} currency={currency} locale={locale} labels={{ amount: t.packs.amount, credits: t.packs.credits }} />
              <Button href={`/signup?next=${encodeURIComponent(`/settings/billing?credits=${packCredits}${currency === "eur" ? "&currency=eur" : ""}`)}`} variant="primary" className="mt-5 w-full">{t.packs.cta.replace("{n}", packCredits.toLocaleString(locale === "nl" ? "nl-NL" : "en-US"))}</Button>
            </div>
          </div>
        )}
        {!compact && <EnterpriseBand t={t} locale={locale} />}
      </div>

      <div id={`${base}-panel-business`} role="tabpanel" aria-labelledby={`${base}-tab-business`} hidden={tab !== "business"} className={cn(tab === "business" && "fold-in")}>
        <div className="grid gap-5 @3xl:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col rounded-card bg-surface p-6 shadow-card ring-1 ring-ink">
            <p className="text-[17px] font-semibold text-ink">{business.name}</p>
            <p className="mt-1 text-[13px] text-muted">{planWords(business, t).tagline}: {t.business.tagline}</p>
            <PriceLine plan={business} interval={interval} className="mt-5" t={t} m={m} />
            <div className="mt-4 max-w-sm"><LevelSelect plan={business} onChange={setLevel("business")} t={t} m={m} interval={interval} /></div>
            <ul className="mt-5 flex-1 space-y-2 text-[14px] text-ink/85">{planWords(business, t).bullets.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}</ul>
            <p className="mt-4 text-[13px] text-muted">{t.business.note}</p>
            <div className="mt-6">
              {onChoose ? (
                <Button type="button" variant="primary" className="w-full" onClick={() => onChoose(business, interval)} disabled={Boolean(busyKey)}>{ctaFor(business, t.business.choose)}</Button>
              ) : (
                <Button href={`/signup?next=${encodeURIComponent(`/settings/team`)}`} variant="primary" className="w-full">{t.business.start}</Button>
              )}
            </div>
          </div>
          <div className="flex flex-col rounded-card bg-surface p-6 shadow-card">
            <p className="text-[17px] font-semibold text-ink">{t.enterprise.title}</p>
            <p className="mt-1 text-[13px] text-muted">{t.enterprise.tagline}</p>
            <p className="mt-5 text-display">{t.enterprise.talk}</p>
            <ul className="mt-5 flex-1 space-y-2 text-[14px] text-ink/85">{t.enterprise.items.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}</ul>
            <div className="mt-6"><Button href={L("/demo")} variant="secondary" className="w-full">{dict(locale).common.contactSales} <ArrowRight className="size-4" aria-hidden /></Button></div>
          </div>
        </div>
      </div>

      <div id={`${base}-panel-api`} role="tabpanel" aria-labelledby={`${base}-tab-api`} hidden={tab !== "api"} className={cn(tab === "api" && "fold-in")}>
        <div className="grid gap-5 @3xl:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card">
            <p className="text-[17px] font-semibold text-ink">{t.api.title}</p>
            <p className="mt-1 text-[15px] text-muted">{t.api.text}</p>
            <ul className="mt-4 space-y-2 text-[14px] text-ink/85">{t.api.items.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}</ul>
            <div className="mt-6 flex flex-wrap gap-2"><Button href="/docs/api" variant="primary">{t.api.docs}</Button><Button href="/docs/mcp" variant="secondary">{t.api.mcp}</Button></div>
          </div>
          <CreditTable t={t} m={m} />
        </div>
      </div>

      {!compact && (
        <>
          <PlanCalculator locale={locale} currency={currency} annual={annual} />
          <CompareSection t={t} locale={locale} />
        </>
      )}
    </div>
  );
}

type T = ReturnType<typeof dict>["pricing"];
type Money = { currency: Currency; locale: Locale };

/** The price, and one line under it that never wraps, so every card's button sits at the same height. */
function PriceLine({ plan, interval, className, t, m }: { plan: Plan; interval: Interval; className?: string; t: T; m: Money }) {
  const formatPrice = (v: number) => formatMoney(v, m.currency, m.locale);
  const p = planPrice(plan, m.currency);
  const price = interval === "annual" ? p.annualMonthly : p.monthly;
  // The launch price in plans.ts is a dollar price; it is never shown next to euros.
  const list = m.currency === "usd" ? activeListPrice(plan) : null;
  // Struck through: the real monthly price next to the annual one, or a real launch price. Nothing invented.
  const struck = interval === "annual" && p.monthly > 0 ? p.monthly : list && list > plan.monthlyUsd ? list : null;
  const totals = annualTotals(plan, m.currency);
  const note = price === 0 ? t.trial.noCard : interval === "annual" ? t.aYear.replace("{year}", formatPrice(totals.yearUsd)).replace("{saving}", formatPrice(totals.savingUsd)) : t.billedMonthly;
  return (
    <div className={className}>
      <p className="flex items-baseline gap-x-2 whitespace-nowrap">
        {struck !== null && <s className="text-[20px] text-muted" aria-label={t.was.replace("{price}", formatPrice(struck))}>{formatPrice(struck)}</s>}
        <span className="text-display">{price === 0 ? (m.locale === "nl" ? "Gratis" : "Free") : formatPrice(price)}</span>
        {price > 0 && <span className="text-base font-medium text-muted">{t.perMonth}</span>}
      </p>
      <p className="mt-1 truncate text-[13px] text-muted" title={note}>{note}</p>
    </div>
  );
}

/** The credits of a plan as one dropdown; each level shows its price for the chosen period. */
function LevelSelect({ plan, onChange, t, m, interval }: { plan: Plan; onChange?: (key: string) => void; t: T; m: Money; interval: Interval }) {
  const levels = planLevels(plan.family);
  const fmt = (n: number) => n.toLocaleString(m.locale === "nl" ? "nl-NL" : "en-US");
  const options = plan.creditsPerMonth === 0
    ? [{ key: plan.key, label: planWords(plan, t).creditsNote }]
    : levels.map((l) => {
        const price = planPrice(l, m.currency);
        return { key: l.key, label: t.creditsOption.replace("{n}", fmt(l.creditsPerMonth)), hint: `${formatMoney(interval === "annual" ? price.annualMonthly : price.monthly, m.currency, m.locale)}${t.perMonth}` };
      });
  return <CreditsSelect label={t.level} options={options} value={plan.key} onChange={(k) => onChange?.(k)} />;
}

/** Plan words in the page language: plans.ts holds the English, the dictionary the translation (all levels of a plan share one entry). */
function planWords(plan: Plan, t: T) {
  const key = plan.family as keyof T["plans"];
  const w = t.plans[key];
  return { tagline: w?.tagline ?? plan.tagline, bullets: (w?.bullets ?? plan.bullets).map((b) => b.replaceAll("{m}", String(plan.creditsPerMonth / 60))), creditsNote: plan.creditsPerMonth > 0 ? t.creditsPerMonth.replace("{n}", plan.creditsPerMonth.toLocaleString("en-US")) : (w && "creditsNote" in w ? w.creditsNote : plan.creditsNote) };
}

/** One plan as a row (Billing): name, credits, price and the button; stacked on a phone. */
function PlanRow({ plan, interval, cta, onLevel, current, t, m }: { plan: Plan; interval: Interval; cta: React.ReactNode; onLevel: (key: string) => void; current: boolean; t: T; m: Money }) {
  const words = planWords(plan, t);
  const p = planPrice(plan, m.currency);
  const price = interval === "annual" ? p.annualMonthly : p.monthly;
  const totals = annualTotals(plan, m.currency);
  const note = interval === "annual" ? t.aYearShort.replace("{year}", formatMoney(totals.yearUsd, m.currency, m.locale)).replace("{saving}", formatMoney(totals.savingUsd, m.currency, m.locale)) : t.billedMonthlyShort;
  return (
    <div className="grid gap-4 p-5 @2xl:grid-cols-[minmax(0,1fr)_12rem_9rem_10rem] @2xl:items-center">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold text-ink">
          {plan.name}
          {current && <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[12px] font-semibold text-success">{t.currentPlan}</span>}
          {!current && planLevels(plan.family)[0].recommended && <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-gold-light"><Star className="size-3 fill-current" aria-hidden />{t.recommendation}</span>}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{words.tagline}</p>
      </div>
      <LevelSelect plan={plan} onChange={onLevel} t={t} m={m} interval={interval} />
      <div className="min-w-0">
        <p className="whitespace-nowrap text-[22px] font-semibold tracking-[-0.02em] text-ink">{formatMoney(price, m.currency, m.locale)}<span className="text-[14px] font-medium text-muted">{t.perMonth}</span></p>
        <p className="truncate text-[12px] text-muted" title={note}>{note}</p>
      </div>
      <div>{cta}</div>
    </div>
  );
}

function PlanCard({ plan, interval, cta, onLevel, t, m }: { plan: Plan; interval: Interval; cta: React.ReactNode; onLevel?: (key: string) => void; t: T; m: Money }) {
  const words = planWords(plan, t);
  const steps = featureSteps(plan.family);
  // The recommendation lives on the base level in plans.ts and holds for every level of that plan.
  const recommended = Boolean(planLevels(plan.family)[0]?.recommended);
  return (
    <div className={cn("relative flex flex-col rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover", recommended && "ring-2 ring-ink")}>
      {recommended && <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-gold-light shadow-soft"><Star className="size-3.5 fill-current" aria-hidden />{t.recommendation}</span>}
      <p className="text-[17px] font-semibold text-ink">{plan.name}</p>
      <p className="mt-1 min-h-10 text-[13px] leading-snug text-muted">{words.tagline}</p>
      <PriceLine plan={plan} interval={interval} className="mt-4" t={t} m={m} />
      <div className="mt-4"><LevelSelect plan={plan} onChange={onLevel} t={t} m={m} interval={interval} /></div>
      <div className="mt-4">{cta}</div>
      <div className="mt-6 flex-1 border-t border-divider pt-5">
        {steps.previous && <p className="mb-2 text-[13px] font-semibold text-ink">{t.everythingIn.replace("{name}", steps.previous)}:</p>}
        <ul className="space-y-2 text-[14px] text-ink/85">
          {steps.added.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{t.features[f]}</li>)}
          {words.bullets.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}
          {steps.locked.map((f) => (
            <li key={f} className="flex items-start gap-2 text-muted"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{t.features[f]}<span className="block text-[12px] text-muted/80">{t.availableIn.replace("{plan}", steps.next ?? "")}</span></span></li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] font-medium text-ink">{plan.key === "free" ? t.freeExpires.replace("{n}", String(CREDIT_EXPIRY.freeAdDays)) : t.neverExpire}</p>
      </div>
    </div>
  );
}

/** The wide dark band under the plans: Enterprise volume, or the done-for-you service. Gold only on ink. */
function EnterpriseBand({ t, locale }: { t: T; locale: Locale }) {
  return (
    <div className="relative mt-8 overflow-hidden rounded-card bg-ink p-7 text-champagne sm:p-9">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-[20px] font-semibold text-champagne"><Building2 className="size-5 text-gold-light" aria-hidden />{t.band.title}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-champagne/75">{t.band.text}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link href={localizePath("/demo", locale)} className="focus-ring inline-flex h-11 items-center gap-1.5 rounded-control bg-gold-light px-5 text-[14px] font-semibold text-ink transition-transform duration-150 hover:-translate-y-px">{t.band.sales} <ArrowRight className="size-4" aria-hidden /></Link>
          <Link href={localizePath("/services/done-for-you", locale)} className="focus-ring inline-flex h-11 items-center rounded-control border border-champagne/25 px-5 text-[14px] font-semibold text-champagne transition-colors duration-150 hover:bg-champagne/10">{t.band.service}</Link>
        </div>
      </div>
    </div>
  );
}

/** The full comparison, folded by default so the cards stay the first thing people read. */
function CompareSection({ t, locale }: { t: T; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="text-center">
      <h3 className="text-title">{t.compare.title}</h3>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="focus-ring mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-surface px-5 text-[14px] font-semibold text-ink shadow-card transition-shadow duration-150 hover:shadow-card-hover">
        {open ? t.compare.hide : t.compare.show}<ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      <div id={id} hidden={!open} className={cn("text-left", open && "fold-in")}>
        <CompareTable t={t} locale={locale} />
      </div>
    </section>
  );
}

function CreditTable({ wide, t, m }: { wide?: boolean; t: T; m: Money }) {
  const formatPrice = (v: number) => formatMoney(v, m.currency, m.locale);
  const table = adCreditTable();
  const pro = PLANS.find((p) => p.key === "pro")!;
  const rate = usdPerCredit(pro, m.currency);
  const perMinute = { speed: translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }), precision: translateCredits({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }) };
  const usd = (c: number) => formatPrice(Math.round(c * rate * 100) / 100);
  return (
    <div className={cn("grid gap-5", wide && "md:grid-cols-2")}>
      {config.features.ads && (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card">
          <table className="w-full text-left text-[15px]">
            <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">{t.creditTable.adLength}</th><th className="px-5 py-3 font-medium">Standard</th><th className="px-5 py-3 font-medium">Premium</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {table.map((r) => (
                <tr key={r.seconds}><td className="px-5 py-3 font-medium text-ink">{r.seconds} s</td><td className="px-5 py-3">{r.standard} credits <span className="text-muted">≈ {usd(r.standard)}</span></td><td className="px-5 py-3">{r.premium} credits <span className="text-muted">≈ {usd(r.premium)}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">{t.creditTable.translation}</th><th className="px-5 py-3 font-medium">{t.creditTable.credits}</th></tr></thead>
          <tbody className="divide-y divide-divider">
            <tr><td className="px-5 py-3 font-medium text-ink">Speed</td><td className="px-5 py-3">{perMinute.speed} <span className="text-muted">≈ {usd(perMinute.speed)}</span></td></tr>
            <tr><td className="px-5 py-3 font-medium text-ink">Precision</td><td className="px-5 py-3">{perMinute.precision} <span className="text-muted">≈ {usd(perMinute.precision)}</span></td></tr>
            <tr><td className="px-5 py-3 text-muted" colSpan={2}>{t.creditTable.enhancement.replace("{plan}", pro.name)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareTable({ t, locale }: { t: T; locale: Locale }) {
  const R = t.compare.rows;
  const cols = [PLANS.find((p) => p.key === "free")!, ...(["starter", "pro", "scale", "business"] as const).map((f) => planLevels(f)[0])];
  const range = (p: Plan) => {
    const l = planLevels(p.family);
    return `${l[0].creditsPerMonth.toLocaleString("en-US")} – ${l[l.length - 1].creditsPerMonth.toLocaleString("en-US")}`;
  };
  const ads = config.features.ads;
  const allRows: ([string, (p: Plan) => string | boolean] | null)[] = [
    [R.credits, (p) => (p.key === "free" ? R.freeAd : range(p))],
    [R.trial, (p) => (p.key === "free" ? false : R.trialValue.replace("{n}", String(TRIAL.days)))],
    ads ? [R.lengths, (p) => (p.key === "free" ? R.tenOnly : R.tenToSixty)] : null,
    [R.translations, () => true],
    [R.precision, (p) => hasFeature(p.key, "precision")],
    [R.premium, (p) => hasFeature(p.key, "premium")],
    ads ? [R.variations, (p) => hasFeature(p.key, "variations")] : null,
    [R.removeText, (p) => hasFeature(p.key, "removeText")],
    [R.enhance, (p) => hasFeature(p.key, "enhance")],
    ads ? [R.brand, () => true] : null,
    [R.api, (p) => hasFeature(p.key, "api")],
    [R.team, (p) => hasFeature(p.key, "team")],
    [R.perMember, (p) => hasFeature(p.key, "team")],
    [R.expire, (p) => (p.key === "free" ? R.freeDays.replace("{n}", String(CREDIT_EXPIRY.freeAdDays)) : R.never)],
    [R.support, () => R.supportValue],
  ];
  const rows = allRows.filter((r): r is [string, (p: Plan) => string | boolean] => r !== null);
  return (
    <div className="mt-8 overflow-x-auto rounded-card bg-surface shadow-card">
      {/* Phones (27 Oct 2026): the feature column stays put while the plans scroll sideways. */}
      <table className="w-full min-w-[720px] text-left text-[15px]">
        <thead className="bg-surface-muted text-[13px] text-muted">
          <tr><th className="sticky left-0 z-10 bg-surface-muted px-5 py-3 font-medium">{t.compare.feature}</th>{cols.map((p) => <th key={p.key} className="px-5 py-3 font-medium text-ink">{p.name}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {rows.map(([label, fn]) => (
            <tr key={label}>
              <td className="sticky left-0 z-10 bg-surface px-5 py-3 text-ink shadow-[1px_0_0_var(--divider)]">{label}</td>
              {cols.map((p) => {
                const v = fn(p);
                return <td key={p.key} className="px-5 py-3 text-muted">{v === true ? <Check className="size-4 text-success" aria-label={t.compare.included} /> : v === false ? <Minus className="size-4 text-border" aria-label={t.compare.notIncluded} /> : v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-5 py-3 text-[13px] text-muted">{t.compare.enterpriseNote} <Link href={localizePath("/demo", locale)} className="underline">{dict(locale).common.contactSales}</Link>. {t.compare.whiteLabel}</p>
    </div>
  );
}
