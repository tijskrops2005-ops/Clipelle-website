"use client";

import { useMemo, useState } from "react";
import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { formatPrice } from "@/lib/plans";
import { creditsNeeded, planFit } from "@/lib/pricingHelpers";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";

/** "Find your plan": sliders for ads and translation minutes, length and quality → credits, best plan, monthly cost, and the visitor's own per-video cost next to it. */
export function PlanFinder() {
  const [ads, setAds] = useState(10);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState<AdLength>(30);
  const [engine, setEngine] = useState<PresenterEngine>("avatar_iii");
  const [current, setCurrent] = useState(0);
  const r = useMemo(() => {
    const need = creditsNeeded({ ads, seconds, engine, translateMinutes: minutes });
    const fit = planFit(need.total, ads);
    return { need, fit };
  }, [ads, minutes, seconds, engine]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-card bg-surface p-6 shadow-card">
        <div className="space-y-5">
          <Range id="pf-ads" label="Ads per month" value={ads} min={0} max={100} step={1} onChange={setAds} format={(v) => String(v)} />
          <Range id="pf-min" label="Translation minutes per month, per language" value={minutes} min={0} max={200} step={1} onChange={setMinutes} format={(v) => `${v} min`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><p className="mb-2 text-sm font-medium text-ink">Ad length</p><SegmentedControl label="Ad length" size="sm" options={AD_LENGTHS.map((l) => ({ key: String(l), label: `${l} s` }))} value={String(seconds)} onChange={(k) => setSeconds(Number(k) as AdLength)} /></div>
            <div><p className="mb-2 text-sm font-medium text-ink">Presenter</p><SegmentedControl label="Presenter quality" size="sm" options={[{ key: "avatar_iii", label: "Standard" }, { key: "avatar_iv", label: "Premium" }]} value={engine} onChange={(k) => setEngine(k as PresenterEngine)} /></div>
          </div>
          <Range id="pf-cur" label="What one video costs you today (optional)" value={current} min={0} max={2000} step={10} onChange={setCurrent} format={(v) => (v ? formatPrice(v) : "—")} />
        </div>
      </div>
      <div className="rounded-card bg-surface p-6 shadow-card" aria-live="polite">
        <p className="label-mono text-muted">Credits needed per month</p>
        <p className="mt-1 text-display">{r.need.total.toLocaleString("en-US")}</p>
        <p className="mt-1 text-[13px] text-muted">{ads} × {r.need.perAd} credits per ad{minutes > 0 ? ` + ${minutes} × ${r.need.perMinute} credits per translation minute` : ""}.</p>
        <div className="mt-5 rounded-[14px] bg-surface-muted p-4">
          <p className="text-[13px] text-muted">Best fitting plan</p>
          <p className="mt-1 text-[22px] font-semibold text-ink">{r.fit.plan ? (r.fit.overScale ? `${r.fit.plan.name} + ${r.fit.packs} credit pack${r.fit.packs === 1 ? "" : "s"}` : r.fit.plan.name) : "Free"}</p>
          <p className="mt-1 text-[15px] text-ink">{formatPrice(r.fit.monthlyUsd)} per month{ads > 0 ? ` · about ${formatPrice(Math.round(r.fit.perVideoUsd * 100) / 100)} per ad` : ""}</p>
          {current > 0 && ads > 0 && (
            <p className="mt-2 text-[13px] text-muted">Your number: {formatPrice(current)} per video, {formatPrice(current * ads)} per month. Difference: {r.fit.monthlyUsd <= current * ads ? `${formatPrice(current * ads - r.fit.monthlyUsd)} less` : `${formatPrice(r.fit.monthlyUsd - current * ads)} more`} with Reelay, from your own input.</p>
          )}
        </div>
        <div className="mt-5"><Button href="/signup" variant="accent">Create your first ad free</Button><p className="mt-2 text-[13px] text-muted">No credit card required.</p></div>
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
