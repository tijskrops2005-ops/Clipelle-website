"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { BUSINESS_TIERS, CREDIT_EXPIRY, PLANS, TOPUPS, activeListPrice, adCreditTable, formatPrice, translateCredits, type Plan } from "@/lib/plans";
import { annualTotals, planExamples, usdPerCredit } from "@/lib/pricingHelpers";
import { PlanFinder } from "./PlanFinder";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

type Interval = "monthly" | "annual";
type Tab = "individual" | "business" | "api";

/**
 * The pricing page body: tabs Individual / Business / API, a monthly-annual switch with the real
 * saving, plan cards (crossed-out prices only from plans.ts), comparison table, plan finder.
 * Every number comes from plans.ts and pricing.ts. `compact` (Billing settings) shows the cards only.
 */
export function PricingTable({ onChoose, busyKey, compact, locale = "en" }: { onChoose?: (plan: Plan, interval: Interval) => void; busyKey?: string | null; compact?: boolean; locale?: Locale }) {
  const t = dict(locale).pricing;
  const L = (p: string) => localizePath(p, locale);
  const [interval, setInterval] = useState<Interval>("annual");
  const [tab, setTab] = useState<Tab>("individual");
  const [tier, setTier] = useState<string>(BUSINESS_TIERS[0].key);
  const base = useId();
  const paid = PLANS.filter((p) => p.key !== "free" && p.key !== "enterprise");
  const free = PLANS.find((p) => p.key === "free")!;
  const business = BUSINESS_TIERS.find((t) => t.key === tier) ?? BUSINESS_TIERS[0];
  const maxSaving = useMemo(() => Math.max(...paid.map((p) => annualTotals(p).savingPct)), [paid]);

  const tabs: { key: Tab; label: string }[] = [{ key: "individual", label: t.tabs.individual }, { key: "business", label: t.tabs.business }, { key: "api", label: t.tabs.api }];

  return (
    <div className="space-y-16">
      <div className="flex flex-col items-center gap-4">
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
          <div className="flex flex-col items-center gap-2">
            <SegmentedControl label={t.period.label} options={[{ key: "monthly", label: t.period.monthly }, { key: "annual", label: t.period.annual.replace("{n}", String(maxSaving)) }]} value={interval} onChange={setInterval} />
            <p className="text-[13px] text-muted">{t.period.note}</p>
          </div>
        )}
      </div>

      <div id={`${base}-panel-individual`} role="tabpanel" aria-labelledby={`${base}-tab-individual`} hidden={tab !== "individual"} className={cn(tab === "individual" && "fold-in")}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <PlanCard plan={free} interval={interval} t={t} cta={<Button href="/signup" variant="secondary" className="w-full">{t.startFree}</Button>} />
          {paid.map((p, i) => (
            <PlanCard key={p.key} plan={p} previous={i === 0 ? free : paid[i - 1]} interval={interval} t={t} cta={
              onChoose ? (
                <Button type="button" variant={p.recommended ? "accent" : "primary"} className="w-full" onClick={() => onChoose(p, interval)} disabled={Boolean(busyKey)}>{busyKey === p.key ? t.openingCheckout : t.choose.replace("{name}", p.name)}</Button>
              ) : (
                <Button href={`/signup?next=${encodeURIComponent(`/settings/billing?plan=${p.key}&interval=${interval}`)}`} variant={p.recommended ? "accent" : "primary"} className="w-full">{t.choose.replace("{name}", p.name)}</Button>
              )
            } />
          ))}
        </div>
        <div className="mt-8 rounded-card bg-surface p-6 shadow-card">
          <p className="text-[17px] font-semibold text-ink">{t.packs.title}</p>
          <p className="mt-1 text-[15px] text-muted">{t.packs.text}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {TOPUPS.map((x) => (
              <li key={x.key} className="flex items-center justify-between rounded-chip bg-surface-muted px-4 py-2.5 text-sm"><span className="font-medium text-ink">{x.credits.toLocaleString("en-US")} {t.packs.credits}</span><span className="text-muted">{formatPrice(x.usd)}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div id={`${base}-panel-business`} role="tabpanel" aria-labelledby={`${base}-tab-business`} hidden={tab !== "business"} className={cn(tab === "business" && "fold-in")}>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col rounded-card bg-surface p-6 shadow-card ring-1 ring-ink">
            <p className="text-[17px] font-semibold text-ink">{business.name}</p>
            <p className="mt-1 text-[13px] text-muted">{planWords(business, t).tagline}: {t.business.tagline}</p>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-ink">{t.business.level}</p>
              <SegmentedControl label={t.business.level} options={BUSINESS_TIERS.map((t) => ({ key: t.key, label: `${t.creditsPerMonth.toLocaleString("en-US")}` }))} value={tier} onChange={setTier} />
            </div>
            <PriceLine plan={business} interval={interval} className="mt-5" t={t} />
            <Examples plan={business} t={t} />
            <ul className="mt-5 flex-1 space-y-2 text-[14px] text-ink/85">{business.bullets.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}</ul>
            <p className="mt-4 text-[13px] text-muted">{t.business.note}</p>
            <div className="mt-6">
              {onChoose ? (
                <Button type="button" variant="primary" className="w-full" onClick={() => onChoose(business, interval)} disabled={Boolean(busyKey)}>{busyKey === business.key ? t.openingCheckout : t.business.choose}</Button>
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
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card">
            <p className="text-[17px] font-semibold text-ink">{t.api.title}</p>
            <p className="mt-1 text-[15px] text-muted">{t.api.text}</p>
            <ul className="mt-4 space-y-2 text-[14px] text-ink/85">{t.api.items.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}</ul>
            <div className="mt-6 flex flex-wrap gap-2"><Button href="/docs/api" variant="primary">{t.api.docs}</Button><Button href="/docs/mcp" variant="secondary">{t.api.mcp}</Button></div>
          </div>
          <CreditTable t={t} />
        </div>
      </div>

      {!compact && (
        <>
          <section>
            <h3 className="text-title text-center">{t.creditTable.title}</h3>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-muted">{t.creditTable.text}</p>
            <div className="mt-8"><CreditTable wide t={t} /></div>
          </section>

          <section>
            <h3 className="text-title text-center">{t.finder.title}</h3>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-muted">{t.finder.text}</p>
            <div className="mt-8"><PlanFinder locale={locale} /></div>
          </section>

          <section>
            <h3 className="text-title text-center">{t.compare.title}</h3>
            <CompareTable t={t} locale={locale} />
          </section>
        </>
      )}
    </div>
  );
}

type T = ReturnType<typeof dict>["pricing"];

function PriceLine({ plan, interval, className, t }: { plan: Plan; interval: Interval; className?: string; t: T }) {
  const creditsNote = planWords(plan, t).creditsNote;
  const price = interval === "annual" ? plan.annualMonthlyUsd : plan.monthlyUsd;
  const list = activeListPrice(plan);
  const struck = interval === "annual" && plan.monthlyUsd > 0 ? plan.monthlyUsd : list && list > plan.monthlyUsd ? list : null;
  const totals = annualTotals(plan);
  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        {struck !== null && <s className="text-[20px] text-muted" aria-label={t.was.replace("{price}", formatPrice(struck))}>{formatPrice(struck)}</s>}
        <span className="text-display">{price === 0 ? "Free" : formatPrice(price)}</span>
        {price > 0 && <span className="text-base font-medium text-muted">{t.perMonth}</span>}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        {price === 0 ? creditsNote : interval === "annual" ? `${t.aYear.replace("{year}", formatPrice(totals.yearUsd)).replace("{saving}", formatPrice(totals.savingUsd))} · ${creditsNote}` : creditsNote}
        {list && interval === "monthly" && list > plan.monthlyUsd ? ` · ${t.launchUntil} ${new Date(plan.listPrice!.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
      </p>
    </div>
  );
}

function Examples({ plan, t }: { plan: Plan; t: T }) {
  if (plan.creditsPerMonth === 0) return null;
  const e = planExamples(plan);
  return <p className="mt-3 text-[13px] text-muted">{t.examples.replace("{ads30}", String(e.ads30)).replace("{ads10}", String(e.ads10)).replace("{premium30}", String(e.premium30)).replace("{minutes}", String(e.translateMinutes))}</p>;
}

/** Plan words in the page language: plans.ts holds the English, the dictionary the translation (Business tiers share one entry). */
function planWords(plan: Plan, t: T) {
  const key = (plan.key.startsWith("business") ? "business" : plan.key) as keyof T["plans"];
  const w = t.plans[key];
  return { tagline: w?.tagline ?? plan.tagline, bullets: (w?.bullets ?? plan.bullets).map((b) => b.replaceAll("{m}", String(plan.creditsPerMonth / 60))), creditsNote: plan.creditsPerMonth > 0 ? t.creditsPerMonth.replace("{n}", plan.creditsPerMonth.toLocaleString("en-US")) : (w && "creditsNote" in w ? w.creditsNote : plan.creditsNote) };
}

function PlanCard({ plan, previous, interval, cta, t }: { plan: Plan; previous?: Plan; interval: Interval; cta: React.ReactNode; t: T }) {
  const words = planWords(plan, t);
  return (
    <div className={cn("flex flex-col rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover", plan.recommended && "ring-1 ring-ink")}>
      {plan.recommended && <span className="label-mono mb-3 w-fit rounded-full bg-ink px-2.5 py-1 text-gold-light">{t.recommendation}</span>}
      <p className="text-[17px] font-semibold text-ink">{plan.name}</p>
      <p className="mt-1 text-[13px] text-muted">{words.tagline}</p>
      <PriceLine plan={plan} interval={interval} className="mt-5" t={t} />
      <Examples plan={plan} t={t} />
      <p className="mt-3 text-[13px] font-medium text-ink">{plan.key === "free" ? t.freeExpires.replace("{n}", String(CREDIT_EXPIRY.freeAdDays)) : t.neverExpire}</p>
      {previous && previous.key !== "free" && <p className="mt-4 label-mono text-muted">{t.everythingIn.replace("{name}", previous.name)}</p>}
      <ul className="mt-2 flex-1 space-y-2 text-[14px] text-ink/85">
        {words.bullets.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}

function CreditTable({ wide, t }: { wide?: boolean; t: T }) {
  const table = adCreditTable();
  const pro = PLANS.find((p) => p.key === "pro")!;
  const rate = usdPerCredit(pro);
  const perMinute = { speed: translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }), precision: translateCredits({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }) };
  const usd = (c: number) => formatPrice(Math.round(c * rate * 100) / 100);
  return (
    <div className={cn("grid gap-5", wide && "md:grid-cols-2")}>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">{t.creditTable.adLength}</th><th className="px-5 py-3 font-medium">Standard</th><th className="px-5 py-3 font-medium">Premium</th></tr></thead>
          <tbody className="divide-y divide-divider">
            {table.map((r) => (
              <tr key={r.seconds}><td className="px-5 py-3 font-medium text-ink">{r.seconds} s</td><td className="px-5 py-3">{r.standard} credits <span className="text-muted">≈ {usd(r.standard)}</span></td><td className="px-5 py-3">{r.premium} credits <span className="text-muted">≈ {usd(r.premium)}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const free = PLANS.find((p) => p.key === "free")!;
  const paid = PLANS.filter((p) => p.key !== "free" && p.key !== "enterprise");
  const business = BUSINESS_TIERS[0];
  const cols = [free, ...paid, business];
  const rows: [string, (p: Plan) => string | boolean][] = [
    [R.credits, (p) => (p.key === "free" ? R.freeAd : p.team ? `${BUSINESS_TIERS[0].creditsPerMonth.toLocaleString("en-US")} – ${BUSINESS_TIERS[BUSINESS_TIERS.length - 1].creditsPerMonth.toLocaleString("en-US")}` : p.creditsPerMonth.toLocaleString("en-US"))],
    [R.lengths, (p) => (p.key === "free" ? R.tenOnly : R.tenToSixty)],
    [R.premium, (p) => p.key !== "free"],
    [R.translations, (p) => p.key !== "free"],
    [R.brand, () => true],
    [R.api, (p) => p.key !== "free"],
    [R.team, (p) => Boolean(p.team)],
    [R.perMember, (p) => Boolean(p.team)],
    [R.expire, (p) => (p.key === "free" ? R.freeDays.replace("{n}", String(CREDIT_EXPIRY.freeAdDays)) : R.never)],
    [R.support, () => R.supportValue],
  ];
  return (
    <div className="mt-8 overflow-x-auto rounded-card bg-surface shadow-card">
      <table className="w-full min-w-[720px] text-left text-[15px]">
        <thead className="bg-surface-muted text-[13px] text-muted lg:sticky lg:top-20">
          <tr><th className="px-5 py-3 font-medium">{t.compare.feature}</th>{cols.map((p) => <th key={p.key} className="px-5 py-3 font-medium text-ink">{p.name}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {rows.map(([label, fn]) => (
            <tr key={label}>
              <td className="px-5 py-3 text-ink">{label}</td>
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
