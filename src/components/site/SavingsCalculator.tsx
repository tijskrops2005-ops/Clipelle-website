"use client";

import { useMemo, useState } from "react";
import { measured } from "@/content/measured";
import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { adCredits, formatPrice, translateCredits } from "@/lib/plans";
import { planFit } from "@/lib/pricingHelpers";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

/**
 * "Reelay vs doing it yourself": the visitor types what a video costs them now, how many they make a
 * month and how long one takes. Next to that: Reelay's credits and the best fitting plan from
 * src/lib/plans.ts, the measured time per video from src/content/measured.ts, and the difference.
 * No market prices, no competitor names, nothing invented: the left column is the visitor's own input.
 */
export function SavingsCalculator({ compact }: { compact?: boolean }) {
  const [currentCost, setCurrentCost] = useState(150);
  const [videos, setVideos] = useState(8);
  const [hours, setHours] = useState(3);
  const [seconds, setSeconds] = useState<AdLength>(30);
  const [engine, setEngine] = useState<PresenterEngine>("avatar_iii");
  const [translateMinutes, setTranslateMinutes] = useState(0);

  const r = useMemo(() => {
    const perAd = adCredits({ seconds, engine });
    const perMinute = translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true });
    const credits = videos * perAd + translateMinutes * perMinute;
    const fit = planFit(credits, videos);
    const yourMonthly = currentCost * videos;
    const yourHours = hours * videos;
    return { perAd, perMinute, credits, fit, yourMonthly, yourHours, savingUsd: yourMonthly - fit.monthlyUsd };
  }, [currentCost, videos, hours, seconds, engine, translateMinutes]);

  const adTime = measured.adMinutes !== null ? `about ${measured.adMinutes} min each (measured)` : "a few minutes each, mostly waiting (not timed yet)";
  const trTime = measured.translationMinutes !== null ? `about ${measured.translationMinutes} min per video (${measured.translationNote})` : "not measured yet";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="rounded-card bg-surface p-6 shadow-card">
        <p className="text-[17px] font-semibold text-ink">Your numbers today</p>
        <p className="mt-1 text-[13px] text-muted">What one video costs you now (a freelancer, an agency, your own time), how many you make, how long one takes. Nothing here is assumed for you.</p>
        <div className="mt-5 space-y-5">
          <Range id="cost" label="What one video costs you now" value={currentCost} min={0} max={2000} step={10} onChange={setCurrentCost} format={(v) => formatPrice(v)} />
          <Range id="videos" label="Videos per month" value={videos} min={1} max={60} step={1} onChange={setVideos} format={(v) => String(v)} />
          <Range id="hours" label="Hours per video" value={hours} min={0} max={40} step={0.5} onChange={setHours} format={(v) => `${v} h`} />
          {!compact && <Range id="minutes" label="Translation minutes per month (per language)" value={translateMinutes} min={0} max={120} step={1} onChange={setTranslateMinutes} format={(v) => `${v} min`} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Ad length</p>
              <SegmentedControl label="Ad length" size="sm" options={AD_LENGTHS.map((l) => ({ key: String(l), label: `${l} s` }))} value={String(seconds)} onChange={(k) => setSeconds(Number(k) as AdLength)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Presenter</p>
              <SegmentedControl label="Presenter quality" size="sm" options={[{ key: "avatar_iii", label: "Standard" }, { key: "avatar_iv", label: "Premium" }]} value={engine} onChange={(k) => setEngine(k as PresenterEngine)} />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-card bg-surface p-6 shadow-card">
        <p className="text-[17px] font-semibold text-ink">Side by side</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-3 font-medium"> </th><th className="py-2 pr-3 font-medium">Doing it yourself (your input)</th><th className="py-2 font-medium">With Reelay</th></tr></thead>
            <tbody className="divide-y divide-divider">
              <tr><td className="py-3 pr-3 font-medium text-ink">Per video</td><td className="py-3 pr-3">{formatPrice(currentCost)}</td><td className="py-3">{r.perAd} credits · about {formatPrice(Math.round(r.fit.perVideoUsd * 100) / 100)} on {r.fit.plan?.name ?? "a plan"}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">Per month</td><td className="py-3 pr-3">{formatPrice(r.yourMonthly)}</td><td className="py-3">{formatPrice(r.fit.monthlyUsd)}{r.fit.overScale ? ` (Scale + ${r.fit.packs} credit pack${r.fit.packs === 1 ? "" : "s"})` : ` (${r.fit.plan?.name}, ${r.fit.plan?.creditsPerMonth.toLocaleString("en-US")} credits)`}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">Your time per video</td><td className="py-3 pr-3">{hours} h</td><td className="py-3">About 5 minutes of input; the rest runs on its own</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">Time to ready</td><td className="py-3 pr-3">{r.yourHours} h per month</td><td className="py-3">{adTime}{translateMinutes > 0 ? `; translations ${trTime}` : ""}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-5 rounded-[14px] bg-surface-muted p-4">
          <p className="text-[13px] text-muted">Difference per month, from your numbers</p>
          <p className="mt-1 text-[26px] font-semibold text-ink">{r.savingUsd >= 0 ? formatPrice(Math.round(r.savingUsd)) : `−${formatPrice(Math.round(-r.savingUsd))}`} <span className="text-[15px] font-normal text-muted">and about {Math.max(0, Math.round(r.yourHours - videos * 5 / 60))} hours</span></p>
          <p className="mt-2 text-[13px] text-muted">Credits needed: {r.credits.toLocaleString("en-US")} per month. Prices from the pricing page; one credit is one second of Standard presenter video. A comparison, not a guarantee: results depend on what you make.</p>
        </div>
      </div>
    </div>
  );
}

function Range({ id, label, value, min, max, step, onChange, format }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        <output htmlFor={id} className="text-sm font-semibold text-ink">{format(value)}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-accent" />
    </div>
  );
}
