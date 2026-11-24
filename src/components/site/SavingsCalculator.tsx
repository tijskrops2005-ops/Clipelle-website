"use client";

import { config } from "@/lib/config";
import { useMemo, useState } from "react";
import { measured } from "@/content/measured";
import { AD_LENGTHS, type AdLength, type PresenterEngine } from "@/lib/pricing";
import { currencyFor, formatMoney, planLabel, translateCredits } from "@/lib/plans";
import { compareCredits, compareMonth, type Billing } from "@/lib/pricingHelpers";
import { useBillingAnnual } from "@/lib/useBilling";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * "Clipelle vs doing it yourself" (24 Oct 2026): the visitor sets what a video costs them now
 * (default $5, the middle of what AI ad tools come to per video), how many they make and how many
 * seconds they are. Next to that: the plan that covers that month (since 26 Oct 2026 a plan or level
 * with the needed features, no monthly packs)
 * (src/lib/pricingHelpers.ts), the measured time, the difference, and every plan side by side.
 * Since 25 Oct 2026 the visitor's own time counts too (minutes per video and what an hour is
 * worth, both their input), against HANDS_ON_MINUTES with Clipelle; when Clipelle costs more at
 * the chosen numbers the page says so plainly. No competitor names. 26 Oct 2026: a switch between
 * translations (the default, our main product: length, languages, Speed or Precision) and ads.
 * 23 Nov 2026: the plan prices follow the same monthly/yearly switch as the plan cards (useBilling),
 * and "per video" is one definition everywhere: credits of the video × the plan's price per credit.
 */

/** Video lengths a translation can have on the slider (the upload limit is three minutes). */
const TRANSLATE_LENGTHS = [15, 30, 60, 90, 120, 180] as const;
export function SavingsCalculator({ compact, locale = "en" }: { compact?: boolean; locale?: Locale }) {
  const c = dict(locale).calculator;
  const currency = currencyFor(locale);
  const sym = currency === "eur" ? "€" : "$";
  const [mode, setMode] = useState<"translate" | "ad">("translate");
  const [trSeconds, setTrSeconds] = useState<number>(30);
  const [languages, setLanguages] = useState(2);
  // Speed only since 24 Nov 2026 (fewer controls); Precision is on the form and on /pricing.
  const quality = "speed" as const;
  const [currentCost, setCurrentCost] = useState(5);
  const [videos, setVideos] = useState(10);
  const [seconds, setSeconds] = useState<AdLength>(30);
  const [engine, setEngine] = useState<PresenterEngine>("avatar_iii");
  const [translateMinutes, setTranslateMinutes] = useState(0);
  const [minutesNow, setMinutesNow] = useState(60);
  const [hourValue, setHourValue] = useState(25);
  const [annual] = useBillingAnnual();
  const billing: Billing = annual ? "annual" : "monthly";

  const r = useMemo(() => {
    const month =
      mode === "translate"
        ? compareCredits({ costNow: currentCost, videos, creditsPerVideo: translateCredits({ seconds: trSeconds, quality, enhance: false }) * languages, minutesNow, hourValue, currency, billing })
        : compareMonth({ costNow: currentCost, videos, seconds, engine, translateMinutes, minutesNow, hourValue, currency, billing });
    return month;
  }, [mode, trSeconds, languages, quality, currentCost, videos, seconds, engine, translateMinutes, minutesNow, hourValue, currency, billing]);

  const adTime = measured.adMinutes !== null ? c.adTimeMeasured.replace("{n}", String(measured.adMinutes)) : c.adTimeUnmeasured;
  const num = (v: number) => v.toLocaleString(locale === "nl" ? "nl-NL" : "en-US");
  const trTime = measured.translationMinutes !== null ? c.trTimeMeasured.replace("{n}", num(measured.translationMinutes)).replace("{note}", measured.translationNote) : c.trTimeUnmeasured;
  const cents = (v: number) => `${sym}${v.toLocaleString(locale === "nl" ? "nl-NL" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const money = (v: number) => (v < 10 ? cents(v) : formatMoney(Math.round(v), currency, locale));
  const hours = (h: number) => `${num(h < 10 ? Math.round(h * 10) / 10 : Math.round(h))} ${c.hourUnit}`;
  const fitName = r.fit.plan ? (r.fit.withPacks ? `${planLabel(r.fit.plan)} ${c.plus} ${r.fit.packs} ${r.fit.packs === 1 ? c.pack : c.packs}` : planLabel(r.fit.plan)) : c.aPlan;
  const translating = mode === "translate";

  const saving = r.savingUsd >= 0;
  const hoursBack = Math.round(r.hoursBack);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
      {/* Left: what you make and what it costs you today. Two short groups, nothing else (24 Nov 2026, Tijs: fewer numbers). */}
      <div className="rounded-card bg-surface p-6 shadow-card sm:p-7">
        {config.features.ads && (
          <div className="mb-5"><SegmentedControl label={c.modeLabel} size="sm" options={[{ key: "translate", label: c.modeTranslate }, { key: "ad", label: c.modeAds }]} value={mode} onChange={(k) => setMode(k as "translate" | "ad")} /></div>
        )}
        <p className="text-[15px] font-semibold text-ink">{c.groupVideos}</p>
        <div className="mt-4 space-y-5">
          <Range id="videos" label={c.videosPerMonth} value={videos} min={1} max={100} step={1} onChange={setVideos} format={(v) => String(v)} />
          {translating ? (
            <>
              <Range id="tr-seconds" label={c.adLength} value={TRANSLATE_LENGTHS.indexOf(trSeconds as (typeof TRANSLATE_LENGTHS)[number])} min={0} max={TRANSLATE_LENGTHS.length - 1} step={1} onChange={(i) => setTrSeconds(TRANSLATE_LENGTHS[i])} format={(i) => `${TRANSLATE_LENGTHS[i]} s`} />
              <Range id="languages" label={c.languages} value={languages} min={1} max={5} step={1} onChange={setLanguages} format={(v) => String(v)} />
            </>
          ) : (
            <>
              <Range id="seconds" label={c.adLength} value={AD_LENGTHS.indexOf(seconds)} min={0} max={AD_LENGTHS.length - 1} step={1} onChange={(i) => setSeconds(AD_LENGTHS[i] as AdLength)} format={(i) => `${AD_LENGTHS[i]} s`} />
              <div>
                <p className="mb-2 text-sm font-medium text-ink">{c.presenter}</p>
                <SegmentedControl label={c.presenter} size="sm" options={[{ key: "avatar_iii", label: c.standard }, { key: "avatar_iv", label: c.premium }]} value={engine} onChange={(k) => setEngine(k as PresenterEngine)} />
              </div>
              {!compact && <Range id="minutes" label={c.translateMinutes} value={translateMinutes} min={0} max={120} step={1} onChange={setTranslateMinutes} format={(v) => `${v} min`} />}
            </>
          )}
        </div>
        <p className="mt-8 text-[15px] font-semibold text-ink">{c.groupToday}</p>
        <div className="mt-4 space-y-5">
          <Range id="cost" label={translating ? c.costNowTranslate : c.costNow} value={currentCost} min={1} max={20} step={0.5} onChange={setCurrentCost} format={cents} />
          <Range id="time" label={c.timeNow} value={minutesNow} min={0} max={180} step={5} onChange={setMinutesNow} format={(v) => `${v} min`} />
          <Range id="hour" label={c.hourValue} value={hourValue} min={0} max={100} step={5} onChange={setHourValue} format={(v) => `${sym}${v}`} />
        </div>
      </div>

      {/* Right: one answer, then the two numbers behind it. */}
      <div className="flex flex-col rounded-card bg-surface p-6 shadow-card sm:p-7">
        <div className={cn("rounded-panel p-5", saving ? "bg-success/10" : "bg-surface-muted")}>
          <p className={cn("text-[2.25rem] font-semibold leading-none tracking-[-0.03em]", saving ? "text-success" : "text-ink")} style={{ fontVariantNumeric: "tabular-nums" }}>
            {money(Math.abs(r.savingUsd))}
          </p>
          <p className="mt-2 text-[15px] text-ink">{saving ? c.resultSaved : c.resultMore}</p>
          {hoursBack > 0 && <p className="mt-0.5 text-[14px] text-muted">{c.resultHours.replace("{h}", String(hoursBack))}</p>}
        </div>

        <dl className="mt-6 grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 gap-y-3 text-[15px]">
          <span />
          <dt className="text-right text-[13px] text-muted">{c.today}</dt>
          <dt className="text-right text-[13px] text-muted">{c.withClipelle}</dt>
          <dd className="text-ink">{c.costMonth}</dd>
          <dd className="text-right tabular-nums text-muted">{money(r.yourMoney)}</dd>
          <dd className="text-right font-semibold tabular-nums text-ink">{money(r.fit.monthlyUsd)}</dd>
          <dd className="text-ink">{c.timeMonth}</dd>
          <dd className="text-right tabular-nums text-muted">{hours(r.yourHours)}</dd>
          <dd className="text-right font-semibold tabular-nums text-ink">{hours(r.ourHours)}</dd>
        </dl>

        <div className="mt-6 space-y-1.5 border-t border-divider pt-5 text-[13px] text-muted">
          <p><span className="font-medium text-ink">{fitName}</span> · {annual ? c.billedYearly : c.billedMonthly}</p>
          <p>{translating ? trTime : adTime}. {c.footnote.replace("{n}", num(r.credits))}</p>
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
        <output htmlFor={id} className="text-sm font-semibold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>{format(value)}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-accent" />
    </div>
  );
}
