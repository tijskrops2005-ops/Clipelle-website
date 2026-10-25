"use client";

import { useMemo, useState } from "react";
import { measured } from "@/content/measured";
import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { adCredits, formatPrice, translateCredits } from "@/lib/plans";
import { INDIVIDUAL_PAID, planFit } from "@/lib/pricingHelpers";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * "Clipelle vs doing it yourself" (24 Oct 2026): the visitor sets what a video costs them now
 * (default $5, the middle of what AI ad tools come to per video), how many they make and how many
 * seconds they are. Next to that: the fitting plan from src/lib/plans.ts, the measured time, the
 * difference, and every plan side by side for that video, so the step from one plan to the next is
 * visible. No competitor names; the left column is the visitor's own input.
 */
export function SavingsCalculator({ compact, locale = "en" }: { compact?: boolean; locale?: Locale }) {
  const c = dict(locale).calculator;
  const [currentCost, setCurrentCost] = useState(5);
  const [videos, setVideos] = useState(10);
  const [seconds, setSeconds] = useState<AdLength>(30);
  const [engine, setEngine] = useState<PresenterEngine>("avatar_iii");
  const [translateMinutes, setTranslateMinutes] = useState(0);

  const r = useMemo(() => {
    const perAd = adCredits({ seconds, engine });
    const perMinute = translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true });
    const credits = videos * perAd + translateMinutes * perMinute;
    const fit = planFit(credits, videos);
    const yourMonthly = currentCost * videos;
    const ladder = INDIVIDUAL_PAID.map((p) => ({ plan: p, videos: Math.floor(p.creditsPerMonth / perAd), perVideo: (p.monthlyUsd / p.creditsPerMonth) * perAd }));
    return { perAd, credits, fit, yourMonthly, ladder, savingUsd: yourMonthly - fit.monthlyUsd };
  }, [currentCost, videos, seconds, engine, translateMinutes]);

  const adTime = measured.adMinutes !== null ? c.adTimeMeasured.replace("{n}", String(measured.adMinutes)) : c.adTimeUnmeasured;
  const trTime = measured.translationMinutes !== null ? c.trTimeMeasured.replace("{n}", String(measured.translationMinutes)).replace("{note}", measured.translationNote) : c.trTimeUnmeasured;
  const money = (v: number) => (v < 10 ? `$${v.toFixed(2)}` : formatPrice(Math.round(v)));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
      <div className="rounded-card bg-surface p-6 shadow-card">
        <p className="text-[17px] font-semibold text-ink">{c.yourNumbers}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{c.yourNumbersText}</p>
        <div className="mt-5 space-y-5">
          <Range id="cost" label={c.costNow} value={currentCost} min={1} max={20} step={0.5} onChange={setCurrentCost} format={(v) => `$${v.toFixed(2)}`} />
          <Range id="videos" label={c.videosPerMonth} value={videos} min={1} max={100} step={1} onChange={setVideos} format={(v) => String(v)} />
          {/* A slider over the lengths a video can have (AD_LENGTHS), with the stops marked underneath. */}
          <div>
            <Range id="seconds" label={c.adLength} value={AD_LENGTHS.indexOf(seconds)} min={0} max={AD_LENGTHS.length - 1} step={1} onChange={(i) => setSeconds(AD_LENGTHS[i] as AdLength)} format={(i) => `${AD_LENGTHS[i]} s`} />
            <div className="mt-1 flex justify-between px-0.5 text-[11px] text-muted" aria-hidden>
              {AD_LENGTHS.map((l) => <span key={l}>{l}s</span>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">{c.presenter}</p>
            <SegmentedControl label={c.presenter} size="sm" options={[{ key: "avatar_iii", label: c.standard }, { key: "avatar_iv", label: c.premium }]} value={engine} onChange={(k) => setEngine(k as PresenterEngine)} />
          </div>
          {!compact && <Range id="minutes" label={c.translateMinutes} value={translateMinutes} min={0} max={120} step={1} onChange={setTranslateMinutes} format={(v) => `${v} min`} />}
        </div>
      </div>

      <div className="rounded-card bg-surface p-6 shadow-card">
        <p className="text-[17px] font-semibold text-ink">{c.sideBySide}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-3 font-medium"> </th><th className="py-2 pr-3 font-medium">{c.diy}</th><th className="py-2 font-medium">{c.withClipelle}</th></tr></thead>
            <tbody className="divide-y divide-divider">
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.perVideo}</td><td className="py-3 pr-3">{money(currentCost)}</td><td className="py-3">{r.perAd} {c.credits} · {c.about} {money(r.fit.perVideoUsd)} {c.on} {r.fit.plan?.name ?? c.aPlan}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.perMonth}</td><td className="py-3 pr-3">{money(r.yourMonthly)}</td><td className="py-3">{formatPrice(r.fit.monthlyUsd)}{r.fit.overScale ? ` (Scale ${c.plus} ${r.fit.packs} ${c.packs})` : ` (${r.fit.plan?.name}, ${r.fit.plan?.creditsPerMonth.toLocaleString("en-US")} ${c.credits})`}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.timeToReady}</td><td className="py-3 pr-3">—</td><td className="py-3">{adTime}{translateMinutes > 0 ? `; ${trTime}` : ""}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-5 rounded-[14px] bg-surface-muted p-4">
          <p className="text-[13px] text-muted">{c.difference}</p>
          <p className="mt-1 text-[26px] font-semibold text-ink">{r.savingUsd >= 0 ? formatPrice(Math.round(r.savingUsd)) : `−${formatPrice(Math.round(-r.savingUsd))}`}</p>
        </div>

        {/* Every plan for the chosen video: price, how many such videos it covers, the price per video. */}
        <p className="mt-6 text-[13px] font-medium text-ink">{c.ladderTitle}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {r.ladder.map((l) => {
            const fits = !r.fit.overScale && r.fit.plan?.key === l.plan.key;
            return (
              <li key={l.plan.key} className={cn("rounded-[14px] border p-3 transition-[border-color,box-shadow] duration-200", fits ? "border-accent/50 bg-accent-soft/40 shadow-soft" : "border-border")}>
                <p className="flex items-center justify-between gap-2 text-[14px] font-semibold text-ink">
                  {l.plan.name}
                  {fits && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">{c.ladderFit}</span>}
                </p>
                <p className="mt-1 text-[13px] text-muted">{formatPrice(l.plan.monthlyUsd)} {c.ladderPerMonth}</p>
                <p className="mt-2 text-[13px] text-ink">{c.ladderVideos.replace("{n}", String(l.videos))}</p>
                <p className="text-[13px] text-muted">{c.ladderPerVideo.replace("{p}", money(l.perVideo))}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-muted">{c.ladderNote} {c.footnote.replace("{n}", r.credits.toLocaleString("en-US"))}</p>
      </div>
    </div>
  );
}

function Range({ id, label, value, min, max, step, onChange, format }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        <output htmlFor={id} className="text-sm font-semibold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>{format(value)}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-accent" />
    </div>
  );
}
