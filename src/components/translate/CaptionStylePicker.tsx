"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CAPTION_COLORS, CAPTION_HIGHLIGHTS, CAPTION_HIGHLIGHT_META, CAPTION_SIZES, CAPTION_SIZE_PX, type CaptionStyleChoice } from "@/lib/captionOptions";

/**
 * The caption choices of a translation (26 Oct 2026): on or off, how the spoken word stands out, its
 * colour, size, capitals and position, with a drawn preview that follows every choice. The preview is
 * an illustration in our own tokens, not a render; the real captions come from the edit service.
 */
export function CaptionStylePicker({ value, onChange, position, onPosition, disabled }: { value: CaptionStyleChoice; onChange: (next: CaptionStyleChoice) => void; position: "low" | "middle"; onPosition: (p: "low" | "middle") => void; disabled?: boolean }) {
  const set = (patch: Partial<CaptionStyleChoice>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Captions</legend>
        <SegmentedControl label="Captions" size="sm" options={[{ key: "on", label: "On" }, { key: "off", label: "Off" }]} value={value.show ? "on" : "off"} onChange={(k) => set({ show: k === "on" })} disabled={disabled} />
        <p className="text-[13px] text-muted">{value.show ? "What is said appears on screen, word by word. Most people watch without sound." : "No captions: you get the translated video only."}</p>
      </fieldset>

      {value.show && (
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:items-start">
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Spoken word</legend>
              <SegmentedControl label="Spoken word" size="sm" options={CAPTION_HIGHLIGHTS.map((h) => ({ key: h, label: CAPTION_HIGHLIGHT_META[h].label }))} value={value.highlight} onChange={(h) => set({ highlight: h })} disabled={disabled} />
              <p className="text-[13px] text-muted">{CAPTION_HIGHLIGHT_META[value.highlight].blurb}</p>
            </fieldset>

            {value.highlight !== "none" && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink">Colour</legend>
                <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
                  {CAPTION_COLORS.map((c) => {
                    const active = c.value === value.color;
                    return (
                      <button key={c.key} type="button" role="radio" aria-checked={active} aria-label={c.label} title={c.label} disabled={disabled} onClick={() => set({ color: c.value })} className={cn("focus-ring grid size-9 place-items-center rounded-full border-2 transition-transform duration-150 hover:scale-105", active ? "border-ink" : "border-border")} style={{ background: c.value }}>
                        {active && <Check className={cn("size-4", c.key === "white" || c.key === "yellow" ? "text-ink" : "text-surface")} aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink">Size</legend>
                <SegmentedControl label="Size" size="sm" options={CAPTION_SIZES.map((s) => ({ key: s, label: s[0].toUpperCase() + s.slice(1) }))} value={value.size} onChange={(s) => set({ size: s })} disabled={disabled} />
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink">Position</legend>
                <SegmentedControl label="Position" size="sm" options={[{ key: "low", label: "Low" }, { key: "middle", label: "Middle" }]} value={position} onChange={onPosition} disabled={disabled} />
              </fieldset>
            </div>

            <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
              <input type="checkbox" checked={value.uppercase} onChange={(e) => set({ uppercase: e.target.checked })} disabled={disabled} className="size-4" />
              Capital letters
            </label>
          </div>

          <CaptionPreview style={value} position={position} />
        </div>
      )}
    </div>
  );
}

/** A small 9:16 frame with a sample line; the second word is the one being spoken. */
function CaptionPreview({ style, position }: { style: CaptionStyleChoice; position: "low" | "middle" }) {
  const words = ["Made", "for", "every", "language"];
  const scale = CAPTION_SIZE_PX[style.size] / 62;
  return (
    <figure className="mx-auto w-[9.5rem]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-tile bg-gradient-to-b from-ink/70 via-ink/45 to-ink/80" aria-hidden>
        <div className="absolute inset-x-3 top-[28%] h-[34%] rounded-[40%] bg-surface/15 blur-md" />
        <p className={cn("absolute inset-x-2 flex flex-wrap justify-center gap-x-1 gap-y-0.5 text-center font-black leading-tight text-surface", position === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-[22%]")} style={{ fontSize: `${Math.round(13 * scale)}px`, textShadow: "0 0 3px var(--ink), 0 0 2px var(--ink)" }}>
          {words.map((w, i) => {
            const spoken = i === 1 && style.highlight !== "none";
            const text = style.uppercase ? w.toUpperCase() : w;
            return (
              <span
                key={w}
                className={cn("rounded-[3px] px-0.5", spoken && style.highlight === "underline" && "underline decoration-2 underline-offset-2")}
                style={spoken ? (style.highlight === "box" ? { background: style.color } : { color: style.color }) : undefined}
              >
                {text}
              </span>
            );
          })}
        </p>
      </div>
      <figcaption className="mt-1.5 text-center text-[11.5px] text-muted">Preview</figcaption>
    </figure>
  );
}
