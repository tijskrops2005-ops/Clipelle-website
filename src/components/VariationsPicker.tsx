"use client";

import { useState } from "react";
import { FORMATS, HOOK_STYLES, MAX_BATCH_VARIANTS, MIN_BATCH_VARIANTS, type Variant } from "@/content/formats";
import { FormatIllustration } from "@/components/FormatIllustrations";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";

type Mode = "formats" | "hooks";

/**
 * "Make variations": 2–5 variants of one product, each a different format or a different hook
 * style. Every variant becomes its own project with its own run and its own credits.
 */
export function VariationsPicker({ on, allowed, planLoaded, variants, onToggle, onChange, disabled, creditsEach }: { on: boolean; allowed: boolean; planLoaded: boolean; variants: Variant[]; onToggle: (on: boolean) => void; onChange: (update: (cur: Variant[]) => Variant[]) => void; disabled?: boolean; creditsEach: number }) {
  const [mode, setMode] = useState<Mode>("formats");
  const active = on && allowed;
  const count = variants.length;

  // Functional updates: quick successive clicks never overwrite each other.
  function toggle(v: Variant) {
    const key = JSON.stringify(v);
    onChange((cur) => {
      const has = cur.some((x) => JSON.stringify(x) === key);
      if (has) return cur.filter((x) => JSON.stringify(x) !== key);
      return cur.length < MAX_BATCH_VARIANTS ? [...cur, v] : cur;
    });
  }
  function switchMode(next: Mode) {
    setMode(next);
    onChange(() => []);
  }

  return (
    <div className="space-y-3">
      <label className={cn("flex cursor-pointer items-start gap-3 rounded-panel border p-4 text-sm text-ink transition-colors duration-150", active ? "border-ink bg-surface" : "border-border bg-surface hover:border-ink/30", !allowed && planLoaded && "cursor-not-allowed opacity-70")}>
        <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} disabled={disabled || !allowed} className="mt-0.5 size-4" />
        <span>
          <span className="font-medium">Make variations</span>
          <span className="block text-[13px] leading-relaxed text-muted">
            {MIN_BATCH_VARIANTS} to {MAX_BATCH_VARIANTS} videos of this product, each with a different format or a different hook. Every variation is its own video with its own credits ({creditsEach} credits each); all credits are reserved before the first one starts.
            {!allowed && planLoaded ? " Variations come with Pro and up: see the plans in Billing." : ""}
          </span>
        </span>
      </label>

      {active && (
        <div className="fold-in space-y-3 rounded-panel border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl label="Vary by" size="sm" options={[{ key: "formats", label: "Formats" }, { key: "hooks", label: "Hook styles" }]} value={mode} onChange={switchMode} disabled={disabled} />
            <p className={cn("text-[13px]", count >= MIN_BATCH_VARIANTS ? "text-muted" : "font-medium text-danger")}>
              {count} of {MAX_BATCH_VARIANTS} chosen{count < MIN_BATCH_VARIANTS ? ` · pick at least ${MIN_BATCH_VARIANTS}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={mode === "formats" ? "Formats to vary" : "Hook styles to vary"}>
            {mode === "formats"
              ? FORMATS.map((f) => {
                  const selected = variants.some((v) => "format" in v && v.format === f.key);
                  return (
                    <button key={f.key} type="button" onClick={() => toggle({ format: f.key })} disabled={disabled || (!selected && count >= MAX_BATCH_VARIANTS)} aria-pressed={selected} title={f.blurb} className={cn("focus-ring flex flex-col items-start gap-2 rounded-panel border p-3 text-left transition-[border-color,background-color] duration-150", selected ? "border-ink bg-surface" : "border-border bg-surface hover:border-ink/30", !selected && count >= MAX_BATCH_VARIANTS && "opacity-50")}>
                      <FormatIllustration format={f.key} className={cn("h-8 w-11", selected ? "text-accent" : "text-ink/70")} />
                      <span className="text-[13px] font-medium leading-tight text-ink">{f.name}</span>
                    </button>
                  );
                })
              : HOOK_STYLES.map((h) => {
                  const selected = variants.some((v) => "hook" in v && v.hook === h.key);
                  return (
                    <button key={h.key} type="button" onClick={() => toggle({ hook: h.key })} disabled={disabled || (!selected && count >= MAX_BATCH_VARIANTS)} aria-pressed={selected} className={cn("focus-ring flex flex-col items-start gap-1 rounded-panel border p-3 text-left transition-[border-color,background-color] duration-150", selected ? "border-ink bg-surface" : "border-border bg-surface hover:border-ink/30", !selected && count >= MAX_BATCH_VARIANTS && "opacity-50")}>
                      <span className="text-[13px] font-medium leading-tight text-ink">{h.name}</span>
                      <span className="text-[12px] leading-snug text-muted">{h.blurb}</span>
                    </button>
                  );
                })}
          </div>
          <p className="text-[13px] text-muted">Each variation gets its own direction and tone from the chosen format or hook; your own direction stays in front of it. The format chips above are replaced by this list while variations are on.</p>
        </div>
      )}
    </div>
  );
}
