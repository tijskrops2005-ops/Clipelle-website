"use client";

import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { barFromHex, barMeta, contrastRatio, effectiveBar, CAPTION_HIGHLIGHTS, CAPTION_HIGHLIGHT_META, CAPTION_SIZES, CAPTION_SIZE_PX, isLightColor, outlineFor, readableOn, type CaptionBar, type CaptionStyleChoice } from "@/lib/captionOptions";

/** Below this the text colour is hard to read on the background (WCAG AA for normal text); the picker says so. */
export const LOW_CONTRAST = 4.5;

/**
 * The caption choices of a translation (26 Oct 2026): on or off, how the spoken word stands out, its
 * colour, size, capitals and position, with a drawn preview that follows every choice. Since 2 Nov
 * 2026 every colour comes from the one colour picker (any hex). The preview is an illustration in our
 * own tokens, not a render, but it shows the same swap the render makes: text that does not read on
 * the background turns black or white.
 */
export function CaptionStylePicker({ value, onChange, position, onPosition, overOldText = false, disabled }: { value: CaptionStyleChoice; onChange: (next: CaptionStyleChoice) => void; position: "low" | "middle"; onPosition: (p: "low" | "middle") => void; /** With text removal: the captions sit where the old text was, on a bar (27 Oct 2026). */ overOldText?: boolean; disabled?: boolean }) {
  const set = (patch: Partial<CaptionStyleChoice>) => onChange({ ...value, ...patch });
  const bar = effectiveBar(value, overOldText);
  // With text removal the captions are always on, on a bar (29 Oct 2026): they hide the cleaned spot.
  const shown = overOldText || value.show;
  const barColor = barMeta(bar).color;
  const textColor = value.textColor ?? "#FFFFFF";
  const lowContrast = Boolean(barColor && contrastRatio(textColor, barColor) < LOW_CONTRAST);
  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Captions</legend>
        {overOldText ? (
          <p className="text-[13px] text-muted">Always on, on a background: they cover the spot where the old text was.</p>
        ) : (
          <>
        <SegmentedControl label="Captions" size="sm" options={[{ key: "on", label: "On" }, { key: "off", label: "Off" }]} value={value.show ? "on" : "off"} onChange={(k) => set({ show: k === "on" })} disabled={disabled} />
        {!value.show && <p className="text-[13px] text-muted">The translated video without captions.</p>}
          </>
        )}
      </fieldset>

      {shown && (
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:items-start">
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Spoken word</legend>
              <SegmentedControl label="Spoken word" size="sm" options={CAPTION_HIGHLIGHTS.map((h) => ({ key: h, label: CAPTION_HIGHLIGHT_META[h].label }))} value={value.highlight} onChange={(h) => set({ highlight: h })} disabled={disabled} />
            </fieldset>

            {/* The three colours (2 Nov 2026): one picker each; the highlight colour only when a word is highlighted. */}
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              {value.highlight !== "none" && <ColorPicker id="captionHighlight" label="Highlight colour" value={value.color} onChange={(hex) => hex && set({ color: hex })} disabled={disabled} />}
              <ColorPicker id="captionText" label="Text colour" value={textColor} onChange={(hex) => hex && set({ textColor: hex })} disabled={disabled} note={lowContrast ? "Low contrast" : undefined} />
              <ColorPicker id="captionBackground" label="Background" value={barColor} onChange={(hex) => set({ bar: barFromHex(hex) as CaptionBar })} allowNone={!overOldText} disabled={disabled} />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink">Size</legend>
                <SegmentedControl label="Size" size="sm" options={CAPTION_SIZES.map((s) => ({ key: s, label: s[0].toUpperCase() + s.slice(1) }))} value={value.size} onChange={(s) => set({ size: s })} disabled={disabled} />
              </fieldset>
              {!overOldText && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-ink">Position</legend>
                  <SegmentedControl label="Position" size="sm" options={[{ key: "low", label: "Low" }, { key: "middle", label: "Middle" }]} value={position} onChange={onPosition} disabled={disabled} />
                </fieldset>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
              <input type="checkbox" checked={value.uppercase} onChange={(e) => set({ uppercase: e.target.checked })} disabled={disabled} className="size-4" />
              Capital letters
            </label>
          </div>

          <CaptionPreview style={value} position={position} bar={bar} overOldText={overOldText} />
        </div>
      )}
    </div>
  );
}

/** A small 9:16 frame with a sample line; the second word is the one being spoken. Same colour rules as the render. */
export function CaptionPreview({ style, position, bar, overOldText }: { style: CaptionStyleChoice; position: "low" | "middle"; bar: CaptionBar; overOldText: boolean }) {
  const words = ["Made", "for", "every", "language"];
  const scale = CAPTION_SIZE_PX[style.size] / 62;
  const box = barMeta(bar);
  // In a box the words take the contrasting colour and lose their outline, as in the real edit.
  const text = box.color ? readableOn(style.textColor ?? (isLightColor(box.color) ? "#111114" : "#FFFFFF"), box.color) : style.textColor ?? "#FFFFFF";
  const highlight = box.color && style.color.toLowerCase() === box.color.toLowerCase() ? (box.color.toUpperCase() === "#D43F1B" ? "#FFFFFF" : "#D43F1B") : style.color;
  return (
    <figure className="mx-auto w-[9.5rem]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-tile bg-gradient-to-b from-ink/70 via-ink/45 to-ink/80" aria-hidden>
        <div className="absolute inset-x-3 top-[28%] h-[34%] rounded-[40%] bg-surface/15 blur-md" />
        <div className={cn("absolute inset-x-2 flex justify-center", position === "middle" && !overOldText ? "top-1/2 -translate-y-1/2" : "bottom-[22%]")}>
          <p
            className={cn("inline-flex max-w-full flex-wrap justify-center gap-x-1 gap-y-0.5 text-center font-black leading-tight", box.color && "rounded-[7px] px-2 py-1.5", box.color && overOldText && "w-[86%]")}
            style={{ fontSize: `${Math.round(13 * scale)}px`, color: text, background: box.color ? hexAlpha(box.color, overOldText ? 1 : box.opacity) : undefined, ...(box.color ? {} : outlined(text, scale)) }}
          >
            {words.map((w, i) => {
              const spoken = i === 1 && style.highlight !== "none";
              const label = style.uppercase ? w.toUpperCase() : w;
              return (
                <span
                  key={w}
                  className={cn("rounded-[3px] px-0.5", spoken && style.highlight === "underline" && "underline decoration-2 underline-offset-2")}
                  style={spoken ? (style.highlight === "box" ? { background: highlight, color: isLightColor(highlight) ? "#111114" : "#FFFFFF", WebkitTextStroke: "0", textShadow: "none" } : { color: highlight, ...(box.color ? {} : outlined(highlight, scale)) }) : undefined}
                >
                  {label}
                </span>
              );
            })}
          </p>
        </div>
      </div>
      <figcaption className="mt-1.5 text-center text-[11.5px] text-muted">Preview</figcaption>
    </figure>
  );
}

/** The same outline as the real captions: black around every colour, white around black words; drawn outside the letters. */
function outlined(color: string, scale: number) {
  return { WebkitTextStroke: `${Math.max(2, Math.round(3 * scale))}px ${outlineFor(color)}`, paintOrder: "stroke fill", textShadow: "0 1px 2px rgba(0,0,0,0.35)" } as const;
}

function hexAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
