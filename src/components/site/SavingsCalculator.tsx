"use client";

import { useMemo, useState } from "react";
import { measured } from "@/content/measured";
import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { adCredits, formatPrice, translateCredits } from "@/lib/plans";
import { planFit } from "@/lib/pricingHelpers";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";

/**
 * "Reelay vs doing it yourself": the visitor types what a video costs them now, how many they make a
 * month and how long one takes. Next to that: Reelay's credits and the best fitting plan from
 * src/lib/plans.ts, the measured time per video from src/content/measured.ts, and the difference.
 * No market prices, no competitor names, nothing invented: the left column is the visitor's own input.
 */
export function SavingsCalculator({ compact, locale = "en" }: { compact?: boolean; locale?: Locale }) {
  const c = dict(locale).calculator;
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

  const adTime = measured.adMinutes !== null ? c.adTimeMeasured.replace("{n}", String(measured.adMinutes)) : c.adTimeUnmeasured;
  const trTime = measured.translationMinutes !== null ? c.trTimeMeasured.replace("{n}", String(measured.translationMinutes)).replace("{note}", measured.translationNote) : c.trTimeUnmeasured;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="rounded-card bg-surface p-6 shadow-card">
        <p className="text-[17px] font-semibold text-ink">{c.yourNumbers}</p>
        <p className="mt-1 text-[13px] text-muted">{c.yourNumbersText}</p>
        <div className="mt-5 space-y-5">
          <Range id="cost" label={c.costNow} value={currentCost} min={0} max={2000} step={10} onChange={setCurrentCost} format={(v) => formatPrice(v)} />
          <Range id="videos" label={c.videosPerMonth} value={videos} min={1} max={60} step={1} onChange={setVideos} format={(v) => String(v)} />
          <Range id="hours" label={c.hoursPerVideo} value={hours} min={0} max={40} step={0.5} onChange={setHours} format={(v) => `${v} h`} />
          {!compact && <Range id="minutes" label={c.translateMinutes} value={translateMinutes} min={0} max={120} step={1} onChange={setTranslateMinutes} format={(v) => `${v} min`} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink">{c.adLength}</p>
              <SegmentedControl label={c.adLength} size="sm" options={AD_LENGTHS.map((l) => ({ key: String(l), label: `${l} s` }))} value={String(seconds)} onChange={(k) => setSeconds(Number(k) as AdLength)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">{c.presenter}</p>
              <SegmentedControl label={c.presenter} size="sm" options={[{ key: "avatar_iii", label: c.standard }, { key: "avatar_iv", label: c.premium }]} value={engine} onChange={(k) => setEngine(k as PresenterEngine)} />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-card bg-surface p-6 shadow-card">
        <p className="text-[17px] font-semibold text-ink">{c.sideBySide}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-3 font-medium"> </th><th className="py-2 pr-3 font-medium">{c.diy}</th><th className="py-2 font-medium">{c.withReelay}</th></tr></thead>
            <tbody className="divide-y divide-divider">
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.perVideo}</td><td className="py-3 pr-3">{formatPrice(currentCost)}</td><td className="py-3">{r.perAd} {c.credits} · {c.about} {formatPrice(Math.round(r.fit.perVideoUsd * 100) / 100)} {c.on} {r.fit.plan?.name ?? c.aPlan}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.perMonth}</td><td className="py-3 pr-3">{formatPrice(r.yourMonthly)}</td><td className="py-3">{formatPrice(r.fit.monthlyUsd)}{r.fit.overScale ? ` (Scale ${c.plus} ${r.fit.packs} ${c.packs})` : ` (${r.fit.plan?.name}, ${r.fit.plan?.creditsPerMonth.toLocaleString("en-US")} ${c.credits})`}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.yourTime}</td><td className="py-3 pr-3">{hours} h</td><td className="py-3">{c.inputTime}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.timeToReady}</td><td className="py-3 pr-3">{r.yourHours} h {c.perMonthUnit}</td><td className="py-3">{adTime}{translateMinutes > 0 ? `; ${trTime}` : ""}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-5 rounded-[14px] bg-surface-muted p-4">
          <p className="text-[13px] text-muted">{c.difference}</p>
          <p className="mt-1 text-[26px] font-semibold text-ink">{r.savingUsd >= 0 ? formatPrice(Math.round(r.savingUsd)) : `−${formatPrice(Math.round(-r.savingUsd))}`} <span className="text-[15px] font-normal text-muted">{c.andHours.replace("{n}", String(Math.max(0, Math.round(r.yourHours - videos * 5 / 60))))}</span></p>
          <p className="mt-2 text-[13px] text-muted">{c.footnote.replace("{n}", r.credits.toLocaleString("en-US"))}</p>
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
