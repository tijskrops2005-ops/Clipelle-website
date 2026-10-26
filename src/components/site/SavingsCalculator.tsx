"use client";

import { useMemo, useState } from "react";
import { measured } from "@/content/measured";
import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { formatPrice, translateCredits } from "@/lib/plans";
import { HANDS_ON_MINUTES, INDIVIDUAL_PAID, compareCredits, compareMonth } from "@/lib/pricingHelpers";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * "Clipelle vs doing it yourself" (24 Oct 2026): the visitor sets what a video costs them now
 * (default $5, the middle of what AI ad tools come to per video), how many they make and how many
 * seconds they are. Next to that: the cheapest way to cover that month with our plans and packs
 * (src/lib/pricingHelpers.ts), the measured time, the difference, and every plan side by side.
 * Since 25 Oct 2026 the visitor's own time counts too (minutes per video and what an hour is
 * worth, both their input), against HANDS_ON_MINUTES with Clipelle; when Clipelle costs more at
 * the chosen numbers the page says so plainly. No competitor names. 26 Oct 2026: a switch between
 * translations (the default, our main product: length, languages, Speed or Precision) and ads.
 */

/** Video lengths a translation can have on the slider (the upload limit is three minutes). */
const TRANSLATE_LENGTHS = [15, 30, 60, 90, 120, 180] as const;
export function SavingsCalculator({ compact, locale = "en" }: { compact?: boolean; locale?: Locale }) {
  const c = dict(locale).calculator;
  const [mode, setMode] = useState<"translate" | "ad">("translate");
  const [trSeconds, setTrSeconds] = useState<number>(30);
  const [languages, setLanguages] = useState(2);
  const [quality, setQuality] = useState<"speed" | "precision">("speed");
  const [currentCost, setCurrentCost] = useState(5);
  const [videos, setVideos] = useState(10);
  const [seconds, setSeconds] = useState<AdLength>(30);
  const [engine, setEngine] = useState<PresenterEngine>("avatar_iii");
  const [translateMinutes, setTranslateMinutes] = useState(0);
  const [minutesNow, setMinutesNow] = useState(60);
  const [hourValue, setHourValue] = useState(25);

  const r = useMemo(() => {
    const month =
      mode === "translate"
        ? compareCredits({ costNow: currentCost, videos, creditsPerVideo: translateCredits({ seconds: trSeconds, quality, enhance: false }) * languages, minutesNow, hourValue })
        : compareMonth({ costNow: currentCost, videos, seconds, engine, translateMinutes, minutesNow, hourValue });
    const ladder = INDIVIDUAL_PAID.map((p) => ({ plan: p, videos: Math.floor(p.creditsPerMonth / month.perAd), perVideo: (p.monthlyUsd / p.creditsPerMonth) * month.perAd }));
    return { ...month, ladder };
  }, [mode, trSeconds, languages, quality, currentCost, videos, seconds, engine, translateMinutes, minutesNow, hourValue]);

  const adTime = measured.adMinutes !== null ? c.adTimeMeasured.replace("{n}", String(measured.adMinutes)) : c.adTimeUnmeasured;
  const trTime = measured.translationMinutes !== null ? c.trTimeMeasured.replace("{n}", String(measured.translationMinutes)).replace("{note}", measured.translationNote) : c.trTimeUnmeasured;
  const money = (v: number) => (v < 10 ? `$${v.toFixed(2)}` : `$${Math.round(v).toLocaleString("en-US")}`);
  const hours = (h: number) => `${h < 10 ? Math.round(h * 10) / 10 : Math.round(h)} h`;
  const fitName = r.fit.plan ? (r.fit.withPacks ? `${r.fit.plan.name} ${c.plus} ${r.fit.packs} ${r.fit.packs === 1 ? c.pack : c.packs}` : r.fit.plan.name) : c.aPlan;
  const translating = mode === "translate";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
      <div className="rounded-card bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[17px] font-semibold text-ink">{c.yourNumbers}</p>
          <SegmentedControl label={c.modeLabel} size="sm" options={[{ key: "translate", label: c.modeTranslate }, { key: "ad", label: c.modeAds }]} value={mode} onChange={(k) => setMode(k as "translate" | "ad")} />
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{translating ? c.yourNumbersTextTranslate : c.yourNumbersText}</p>
        <div className="mt-5 space-y-5">
          <Range id="cost" label={translating ? c.costNowTranslate : c.costNow} value={currentCost} min={1} max={20} step={0.5} onChange={setCurrentCost} format={(v) => `$${v.toFixed(2)}`} />
          <Range id="time" label={c.timeNow} value={minutesNow} min={0} max={180} step={5} onChange={setMinutesNow} format={(v) => `${v} min`} />
          <Range id="hour" label={c.hourValue} value={hourValue} min={0} max={100} step={5} onChange={setHourValue} format={(v) => `$${v}`} />
          <Range id="videos" label={c.videosPerMonth} value={videos} min={1} max={100} step={1} onChange={setVideos} format={(v) => String(v)} />
          {translating ? (
            <>
              <div>
                <Range id="tr-seconds" label={c.adLength} value={TRANSLATE_LENGTHS.indexOf(trSeconds as (typeof TRANSLATE_LENGTHS)[number])} min={0} max={TRANSLATE_LENGTHS.length - 1} step={1} onChange={(i) => setTrSeconds(TRANSLATE_LENGTHS[i])} format={(i) => `${TRANSLATE_LENGTHS[i]} s`} />
                <div className="mt-1 flex justify-between px-0.5 text-[11px] text-muted" aria-hidden>
                  {TRANSLATE_LENGTHS.map((l) => <span key={l}>{l}s</span>)}
                </div>
              </div>
              <Range id="languages" label={c.languages} value={languages} min={1} max={5} step={1} onChange={setLanguages} format={(v) => String(v)} />
              <div>
                <p className="mb-2 text-sm font-medium text-ink">{c.quality}</p>
                <SegmentedControl label={c.quality} size="sm" options={[{ key: "speed", label: "Speed" }, { key: "precision", label: "Precision" }]} value={quality} onChange={(k) => setQuality(k as "speed" | "precision")} />
              </div>
            </>
          ) : (
          <>
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
          </>
          )}
        </div>
      </div>

      <div className="rounded-card bg-surface p-6 shadow-card">
        <p className="text-[17px] font-semibold text-ink">{c.sideBySide}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead className="text-[13px] text-muted"><tr><th className="py-2 pr-3 font-medium"> </th><th className="py-2 pr-3 font-medium">{c.diy}</th><th className="py-2 font-medium">{c.withClipelle}</th></tr></thead>
            <tbody className="divide-y divide-divider">
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.perVideo}</td><td className="py-3 pr-3">{money(currentCost)}</td><td className="py-3">{r.perAd} {c.credits} · {c.about} {money(r.fit.perVideoUsd)} {c.on} {fitName}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.moneyPerMonth}</td><td className="py-3 pr-3">{money(r.yourMoney)}</td><td className="py-3">{money(r.fit.monthlyUsd)} ({fitName})</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.yourTime}</td><td className="py-3 pr-3">{hours(r.yourHours)}</td><td className="py-3">{hours(r.ourHours)} <span className="text-muted">· {c.handsOn.replace("{n}", String(HANDS_ON_MINUTES))}</span></td></tr>
              <tr><td className="py-3 pr-3 font-semibold text-ink">{c.totalPerMonth}</td><td className="py-3 pr-3 font-semibold">{money(r.yourTotal)}</td><td className="py-3 font-semibold">{money(r.ourTotal)}</td></tr>
              <tr><td className="py-3 pr-3 font-medium text-ink">{c.timeToReady}</td><td className="py-3 pr-3">—</td><td className="py-3">{translating ? trTime : `${adTime}${translateMinutes > 0 ? `; ${trTime}` : ""}`}</td></tr>
            </tbody>
          </table>
        </div>
        {/* The difference, said plainly in both directions: a saving, or how much more Clipelle costs at these numbers. */}
        <div className={cn("mt-5 rounded-[14px] p-4", r.savingUsd >= 0 ? "bg-success/10" : "bg-surface-muted")}>
          <p className="text-[13px] text-muted">{r.savingUsd >= 0 ? c.savedLabel : c.moreLabel}</p>
          <p className={cn("mt-1 text-[26px] font-semibold", r.savingUsd >= 0 ? "text-success" : "text-ink")}>
            {r.savingUsd >= 0 ? money(r.savingUsd) : c.moreText.replace("{n}", money(-r.savingUsd))}
          </p>
          {r.hoursBack > 0 && <p className="mt-1 text-[13px] text-ink">{c.hoursBack.replace("{h}", String(Math.round(r.hoursBack)))}</p>}
        </div>

        {/* Every plan for the chosen video: price, how many such videos it covers, the price per video. */}
        <p className="mt-6 text-[13px] font-medium text-ink">{c.ladderTitle}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {r.ladder.map((l) => {
            const fits = r.fit.plan?.key === l.plan.key;
            return (
              <li key={l.plan.key} className={cn("rounded-[14px] border p-3 transition-[border-color,box-shadow] duration-200", fits ? "border-accent/50 bg-accent-soft/40 shadow-soft" : "border-border")}>
                <p className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[14px] font-semibold text-ink">
                  {l.plan.name}
                  {fits && <span className="whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">{c.ladderFit}</span>}
                </p>
                <p className="mt-1 text-[13px] text-muted">{formatPrice(l.plan.monthlyUsd)} {c.ladderPerMonth}</p>
                <p className="mt-2 text-[13px] text-ink">{c.ladderVideos.replace("{n}", String(l.videos))}</p>
                <p className="text-[13px] text-muted">{c.ladderPerVideo.replace("{p}", money(l.perVideo))}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-muted">{c.ladderNote} {c.timeNote.replace("{n}", String(HANDS_ON_MINUTES))} {c.footnote.replace("{n}", r.credits.toLocaleString("en-US"))}</p>
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
