"use client";

import { FORMATS, type FormatKey } from "@/content/formats";
import { FormatIllustration } from "@/components/FormatIllustrations";
import { cn } from "@/lib/utils";

/**
 * Format chips for the ad form: each one has an illustration and a short explanation. Choosing
 * one fills the Direction and Tone fields (visible, editable); no format = the form as before.
 */
export function FormatPicker({ value, onChange, disabled }: { value?: FormatKey; onChange: (key: FormatKey | undefined) => void; disabled?: boolean }) {
  const chosen = FORMATS.find((f) => f.key === value);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Format">
        {FORMATS.map((f) => {
          const selected = value === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onChange(selected ? undefined : f.key)}
              disabled={disabled}
              aria-pressed={selected}
              title={f.blurb}
              className={cn(
                "focus-ring flex flex-col items-start gap-2 rounded-panel border p-3 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-px",
                selected ? "border-ink bg-surface" : "border-border bg-surface-muted/60 hover:bg-surface",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <FormatIllustration format={f.key} className={cn("h-9 w-12", selected ? "text-accent" : "text-ink/70")} />
              <span className="text-[13px] font-medium leading-tight text-ink">{f.name}</span>
            </button>
          );
        })}
      </div>
      {chosen ? (
        <div className="panel space-y-1.5 p-3 text-[13px] leading-relaxed">
          <p className="text-ink"><span className="font-medium">{chosen.name}.</span> {chosen.blurb}</p>
          <p className="text-muted">Works for: {chosen.worksFor}</p>
          <p className="text-muted">Spoken structure: {chosen.structure.join(" → ")}. Hook: {chosen.hookStyle}.</p>
          <p className="text-muted">This fills the Direction field and sets the tone below; edit either as you like.</p>
        </div>
      ) : (
        <p className="text-[13px] text-muted">Optional. A format fills the direction and tone for the script; without one the script follows your description.</p>
      )}
    </div>
  );
}
