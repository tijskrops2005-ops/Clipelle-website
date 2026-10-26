"use client";

import { useId, useState } from "react";
import { CUSTOM_CREDITS, customCreditsPrice, formatMoney, type Currency } from "@/lib/plans";
import { cn } from "@/lib/utils";

const PRESETS = [200, 500, 1000, 2500, 5000];

/**
 * Pick any number of one-off credits (26 Oct 2026): a slider from CUSTOM_CREDITS.min to max, a few
 * quick amounts, and a number field for an exact amount. The price is credits × the pack rate.
 */
export function CreditsSlider({ value, onChange, currency, locale = "en", labels }: { value: number; onChange: (credits: number) => void; currency: Currency; locale?: string; labels: { amount: string; credits: string } }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(CUSTOM_CREDITS.max, Math.max(CUSTOM_CREDITS.min, Math.round(n / CUSTOM_CREDITS.step) * CUSTOM_CREDITS.step));
  const fmt = (n: number) => n.toLocaleString(locale === "nl" ? "nl-NL" : "en-US");
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor={`${id}-n`} className="text-[13px] text-muted">{labels.amount}</label>
          <p className="mt-0.5 flex items-baseline gap-2">
            <input
              id={`${id}-n`}
              inputMode="numeric"
              value={draft ?? fmt(value)}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                const n = Number((draft ?? "").replace(/[^\d]/g, ""));
                if (draft !== null && n > 0) onChange(clamp(n));
                setDraft(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="focus-ring rounded-control border-0 bg-transparent p-0 text-[28px] font-semibold tracking-[-0.02em] text-ink"
              style={{ fontVariantNumeric: "tabular-nums", width: `${(draft ?? fmt(value)).length + 0.1}ch` }}
            />
            <span className="text-[15px] font-medium text-muted">{labels.credits}</span>
          </p>
        </div>
        <p className="text-[28px] font-semibold tracking-[-0.02em] text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(customCreditsPrice(value), currency, locale)}</p>
      </div>
      <input
        type="range"
        aria-label={labels.amount}
        min={CUSTOM_CREDITS.min}
        max={CUSTOM_CREDITS.max}
        step={CUSTOM_CREDITS.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 w-full accent-accent"
      />
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)} aria-pressed={value === p} className={cn("focus-ring h-8 rounded-full px-1 text-[12.5px] font-medium transition-colors", value === p ? "bg-ink text-surface" : "bg-surface text-ink shadow-soft hover:bg-divider")}>
            {fmt(p)}
          </button>
        ))}
      </div>
    </div>
  );
}
