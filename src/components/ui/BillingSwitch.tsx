"use client";

import { cn } from "@/lib/utils";

/** "Monthly ( ) Annual  Save up to 17%": one switch for the billing period, as on the homepage. */
export function BillingSwitch({ annual, onChange, labels }: { annual: boolean; onChange: (annual: boolean) => void; labels: { monthly: string; annual: string; save: string; billingLabel: string } }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-[14px]">
      <button type="button" onClick={() => onChange(false)} className={cn("focus-ring rounded-control font-medium transition-colors", annual ? "text-muted hover:text-ink" : "text-ink")}>{labels.monthly}</button>
      <button
        type="button"
        role="switch"
        aria-checked={annual}
        aria-label={labels.billingLabel}
        onClick={() => onChange(!annual)}
        className={cn("focus-ring relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200", annual ? "bg-ink" : "bg-divider")}
      >
        <span className={cn("absolute left-1 top-1 size-5 rounded-full bg-surface shadow-soft transition-transform duration-200 motion-reduce:transition-none", annual && "translate-x-5")} />
      </button>
      <button type="button" onClick={() => onChange(true)} className={cn("focus-ring rounded-control font-medium transition-colors", annual ? "text-ink" : "text-muted hover:text-ink")}>{labels.annual}</button>
      <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[12.5px] font-semibold text-success">{labels.save}</span>
    </div>
  );
}
