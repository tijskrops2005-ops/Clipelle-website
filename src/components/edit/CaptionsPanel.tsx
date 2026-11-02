"use client";

import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CAPTION_PRESETS, type EditRecipe } from "@/lib/editRecipe";
import { barFromHex, barMeta, contrastRatio, isDefaultCaptionStyle, type CaptionBar } from "@/lib/captionOptions";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { LOW_CONTRAST } from "@/components/translate/CaptionStylePicker";
import { formatDuration } from "@/components/ui/VideoDropzone";

/**
 * Captions on the edit screen (2 Nov 2026): on or off, a few style presets, the position, and every
 * line with its text and times. The preview follows at once; the export renders the lines as left here.
 */
export function CaptionsPanel({ recipe, onRecipe, time, onSeek, disabled }: { recipe: EditRecipe; onRecipe: (next: EditRecipe) => void; time: number; onSeek: (t: number) => void; disabled?: boolean }) {
  const captions = recipe.captions;
  if (!captions) return <p className="text-[13px] text-muted">This video has no caption lines to edit.</p>;
  const set = (patch: Partial<NonNullable<EditRecipe["captions"]>>) => onRecipe({ ...recipe, captions: { ...captions, ...patch } });
  const presetKey = CAPTION_PRESETS.find((p) => JSON.stringify(p.style) === JSON.stringify(captions.style))?.key ?? (isDefaultCaptionStyle(captions.style) ? "bold" : "custom");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl label="Captions" size="sm" options={[{ key: "on", label: "On" }, { key: "off", label: "Off" }]} value={captions.enabled ? "on" : "off"} onChange={(k) => set({ enabled: k === "on" })} disabled={disabled} />
        {captions.enabled && <SegmentedControl label="Caption position" size="sm" options={[{ key: "low", label: "Low" }, { key: "middle", label: "Middle" }]} value={captions.position} onChange={(k) => set({ position: k })} disabled={disabled} />}
      </div>
      {captions.enabled && (
        <>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Style</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Caption style">
              {CAPTION_PRESETS.map((p) => (
                <button key={p.key} type="button" role="radio" aria-checked={presetKey === p.key} onClick={() => set({ style: p.style })} disabled={disabled} className={cn("focus-ring rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors", presetKey === p.key ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink hover:border-ink/40")}>
                  {p.label}
                </button>
              ))}
              {presetKey === "custom" && <span className="self-center text-[13px] text-muted">Custom</span>}
            </div>
            {/* The one colour picker (2 Nov 2026): the three caption colours, free hex, the preview follows. */}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-4">
              {captions.style.highlight !== "none" && <ColorPicker id="editHighlight" label="Highlight colour" value={captions.style.color} onChange={(hex) => hex && set({ style: { ...captions.style, color: hex } })} disabled={disabled} />}
              <ColorPicker id="editText" label="Text colour" value={captions.style.textColor ?? "#FFFFFF"} onChange={(hex) => hex && set({ style: { ...captions.style, textColor: hex } })} disabled={disabled} note={barMeta(captions.style.bar).color && contrastRatio(captions.style.textColor ?? "#FFFFFF", barMeta(captions.style.bar).color!) < LOW_CONTRAST ? "Low contrast" : undefined} />
              <ColorPicker id="editBackground" label="Background" value={barMeta(captions.style.bar).color} onChange={(hex) => set({ style: { ...captions.style, bar: barFromHex(hex) as CaptionBar } })} allowNone disabled={disabled} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Lines <span className="font-normal text-muted">· click a time to jump there</span></p>
            <ol className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {captions.cues.map((cue, i) => {
                const live = time >= cue.start && time < cue.end;
                return (
                  <li key={cue.index} className={cn("grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-[10px] p-2 transition-colors", live ? "bg-accent/10" : "bg-surface-muted")}>
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => onSeek(cue.start)} className="focus-ring rounded-control text-left text-[12px] tabular-nums text-ink underline decoration-border underline-offset-2 hover:decoration-ink">{formatDuration(cue.start)}</button>
                      <div className="flex items-center gap-1 text-[11px] text-muted">
                        <input type="number" step={0.1} min={0} max={recipe.sourceSeconds} value={cue.start} onChange={(e) => set({ cues: captions.cues.map((c, j) => (j === i ? { ...c, start: Math.max(0, Math.min(Number(e.target.value), c.end - 0.2)) } : c)) })} disabled={disabled} aria-label={`Start of line ${i + 1}`} className="w-14 rounded-[6px] border border-border bg-surface px-1 py-0.5 text-[11px] tabular-nums text-ink" />
                        –
                        <input type="number" step={0.1} min={0} max={recipe.sourceSeconds} value={cue.end} onChange={(e) => set({ cues: captions.cues.map((c, j) => (j === i ? { ...c, end: Math.min(recipe.sourceSeconds, Math.max(Number(e.target.value), c.start + 0.2)) } : c)) })} disabled={disabled} aria-label={`End of line ${i + 1}`} className="w-14 rounded-[6px] border border-border bg-surface px-1 py-0.5 text-[11px] tabular-nums text-ink" />
                      </div>
                    </div>
                    <textarea value={cue.text} rows={2} maxLength={400} onChange={(e) => set({ cues: captions.cues.map((c, j) => (j === i ? { ...c, text: e.target.value } : c)) })} disabled={disabled} aria-label={`Line ${i + 1}`} className="focus-ring w-full resize-none rounded-[8px] border border-border bg-surface px-2 py-1.5 text-[13px] leading-snug text-ink" />
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 text-[12.5px] text-muted">The voice stays as it is; only the captions change.</p>
          </div>
        </>
      )}
    </div>
  );
}
