"use client";

import { useMemo, useState } from "react";
import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { currencyFor, formatMoney } from "@/lib/plans";
import { ALL_SUBSCRIPTIONS, creditsNeeded, planFit } from "@/lib/pricingHelpers";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";

/** "Find your plan": sliders for ads and translation minutes, length and quality → credits, best plan, monthly cost, and the visitor's own per-video cost next to it. */
export function PlanFinder({ locale = "en" }: { locale?: Locale }) {
  const d = dict(locale);
  const f = d.pricing.finder;
  const c = d.calculator;
  const currency = currencyFor(locale);
  const formatPrice = (v: number) => formatMoney(v, currency, locale);
  const [ads, setAds] = useState(10);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState<AdLength>(30);
  const [engine, setEngine] = useState<PresenterEngine>("avatar_iii");
  const [current, setCurrent] = useState(0);
  const r = useMemo(() => {
    const need = creditsNeeded({ ads, seconds, engine, translateMinutes: minutes });
    const fit = planFit(need.total, ads, ALL_SUBSCRIPTIONS, currency);
    return { need, fit };
  }, [ads, minutes, seconds, engine, currency]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-card bg-surface p-6 shadow-card">
        <div className="space-y-5">
          <Range id="pf-ads" label={f.ads} value={ads} min={0} max={100} step={1} onChange={setAds} format={(v) => String(v)} />
          <Range id="pf-min" label={f.minutes} value={minutes} min={0} max={200} step={1} onChange={setMinutes} format={(v) => `${v} min`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><p className="mb-2 text-sm font-medium text-ink">{c.adLength}</p><SegmentedControl label={c.adLength} size="sm" options={AD_LENGTHS.map((l) => ({ key: String(l), label: `${l} s` }))} value={String(seconds)} onChange={(k) => setSeconds(Number(k) as AdLength)} /></div>
            <div><p className="mb-2 text-sm font-medium text-ink">{c.presenter}</p><SegmentedControl label={c.presenter} size="sm" options={[{ key: "avatar_iii", label: c.standard }, { key: "avatar_iv", label: c.premium }]} value={engine} onChange={(k) => setEngine(k as PresenterEngine)} /></div>
          </div>
          <Range id="pf-cur" label={f.current} value={current} min={0} max={2000} step={10} onChange={setCurrent} format={(v) => (v ? formatPrice(v) : "—")} />
        </div>
      </div>
      <div className="rounded-card bg-surface p-6 shadow-card" aria-live="polite">
        <p className="label-mono text-muted">{f.creditsNeeded}</p>
        <p className="mt-1 text-display">{r.need.total.toLocaleString("en-US")}</p>
        <p className="mt-1 text-[13px] text-muted">{f.breakdown.replace("{ads}", String(ads)).replace("{perAd}", String(r.need.perAd))}{minutes > 0 ? f.breakdownMinutes.replace("{minutes}", String(minutes)).replace("{perMinute}", String(r.need.perMinute)) : ""}.</p>
        <div className="mt-5 rounded-[14px] bg-surface-muted p-4">
          <p className="text-[13px] text-muted">{f.best}</p>
          <p className="mt-1 text-[22px] font-semibold text-ink">{r.fit.plan ? (r.fit.withPacks ? `${r.fit.plan.name} ${c.plus} ${r.fit.packs} ${c.packs}` : r.fit.plan.name) : f.free}</p>
          <p className="mt-1 text-[15px] text-ink">{f.perMonthCost.replace("{price}", formatPrice(r.fit.monthlyUsd))}{ads > 0 ? f.perAd.replace("{price}", formatPrice(Math.round(r.fit.perVideoUsd * 100) / 100)) : ""}</p>
          {current > 0 && ads > 0 && (
            <p className="mt-2 text-[13px] text-muted">{f.yourNumber.replace("{per}", formatPrice(current)).replace("{month}", formatPrice(current * ads)).replace("{diff}", r.fit.monthlyUsd <= current * ads ? f.less.replace("{n}", formatPrice(current * ads - r.fit.monthlyUsd)) : f.more.replace("{n}", formatPrice(r.fit.monthlyUsd - current * ads)))}</p>
          )}
        </div>
        <div className="mt-5"><Button href="/signup" variant="accent">{d.common.createFirstAd}</Button><p className="mt-2 text-[13px] text-muted">{d.common.noCard}</p></div>
      </div>
    </div>
  );
}

function Range({ id, label, value, min, max, step, onChange, format }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-medium text-ink">{label}</label><output htmlFor={id} className="text-sm font-semibold text-ink">{format(value)}</output></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-accent" />
    </div>
  );
}
