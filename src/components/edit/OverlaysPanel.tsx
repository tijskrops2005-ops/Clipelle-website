"use client";

import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { OVERLAY_MAX_CHARS, type EditRecipe } from "@/lib/editRecipe";
import { formatDuration } from "@/components/ui/VideoDropzone";

/**
 * Text and logo on the edit screen (2 Nov 2026): a line of text at the top or bottom for part of the
 * video, a call to action near the end, and the brand logo from Settings top right. Each is a
 * switch with a few fields; nothing is on until the customer turns it on.
 */
export function OverlaysPanel({ recipe, onRecipe, time, logoUrl, disabled }: { recipe: EditRecipe; onRecipe: (next: EditRecipe) => void; time: number; logoUrl?: string | null; disabled?: boolean }) {
  const total = recipe.sourceSeconds;
  const lt = recipe.lowerThird ?? { enabled: false, text: "", from: 0, to: Math.min(total, 5), position: "bottom" as const };
  const cta = recipe.cta ?? { enabled: false, text: "", from: Math.max(0, total - 4), to: total };
  const logo = recipe.logo ?? { enabled: false };
  const setLt = (patch: Partial<typeof lt>) => onRecipe({ ...recipe, lowerThird: { ...lt, ...patch } });
  const setCta = (patch: Partial<typeof cta>) => onRecipe({ ...recipe, cta: { ...cta, ...patch } });
  return (
    <div className="space-y-6">
      <Block title="Text on screen" hint="A name, a claim or a note, in a soft bar." on={lt.enabled} onToggle={(v) => setLt({ enabled: v })} disabled={disabled}>
        <Input value={lt.text} maxLength={OVERLAY_MAX_CHARS} onChange={(e) => setLt({ text: e.target.value })} placeholder="e.g. Dr. Sam, dermatologist" disabled={disabled} aria-label="Text on screen" />
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl label="Where" size="sm" options={[{ key: "bottom", label: "Bottom" }, { key: "top", label: "Top" }]} value={lt.position} onChange={(k) => setLt({ position: k })} disabled={disabled} />
          <TimeRange from={lt.from} to={lt.to} total={total} time={time} onChange={(from, to) => setLt({ from, to })} disabled={disabled} />
        </div>
      </Block>
      <Block title="Call to action" hint="A short line in your accent colour, near the bottom." on={cta.enabled} onToggle={(v) => setCta({ enabled: v })} disabled={disabled}>
        <Input value={cta.text} maxLength={OVERLAY_MAX_CHARS} onChange={(e) => setCta({ text: e.target.value })} placeholder="e.g. Shop now at glowco.com" disabled={disabled} aria-label="Call to action" />
        <TimeRange from={cta.from} to={cta.to} total={total} time={time} onChange={(from, to) => setCta({ from, to })} disabled={disabled} />
      </Block>
      <Block title="Brand logo" hint={logoUrl ? "Your logo from Settings, top right, the whole video." : "No logo yet."} on={logo.enabled} onToggle={(v) => onRecipe({ ...recipe, logo: { enabled: v } })} disabled={disabled || !logoUrl}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Your logo" className="max-h-10 max-w-[140px] object-contain" />
        ) : (
          <p className="text-[13px] text-muted">Upload one under <Link href="/settings/brand" className="font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Settings → Brand</Link>, then come back here.</p>
        )}
      </Block>
    </div>
  );
}

function Block({ title, hint, on, onToggle, disabled, children }: { title: string; hint: string; on: boolean; onToggle: (v: boolean) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-panel border border-border p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} disabled={disabled} className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="block text-sm font-medium text-ink">{title}</span>
          <span className="block text-[13px] text-muted">{hint}</span>
        </span>
      </label>
      {on && <div className="space-y-3 pl-7">{children}</div>}
    </section>
  );
}

/** From–to in seconds of the video, with "from here" and "until here" at the playhead. */
function TimeRange({ from, to, total, time, onChange, disabled }: { from: number; to: number; total: number; time: number; onChange: (from: number, to: number) => void; disabled?: boolean }) {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
      <span>From</span>
      <input type="number" step={0.1} min={0} max={total} value={from} onChange={(e) => onChange(Math.max(0, Math.min(Number(e.target.value), to - 0.5)), to)} disabled={disabled} aria-label="From second" className="w-16 rounded-[6px] border border-border bg-surface px-1.5 py-1 tabular-nums text-ink" />
      <span>to</span>
      <input type="number" step={0.1} min={0} max={total} value={to} onChange={(e) => onChange(from, Math.min(total, Math.max(Number(e.target.value), from + 0.5)))} disabled={disabled} aria-label="To second" className="w-16 rounded-[6px] border border-border bg-surface px-1.5 py-1 tabular-nums text-ink" />
      <button type="button" onClick={() => onChange(Math.min(r1(time), to - 0.5), to)} disabled={disabled} className="focus-ring rounded-control text-ink underline decoration-border underline-offset-4 hover:decoration-ink">from here ({formatDuration(time)})</button>
      <button type="button" onClick={() => onChange(from, Math.max(r1(time), from + 0.5))} disabled={disabled} className="focus-ring rounded-control text-ink underline decoration-border underline-offset-4 hover:decoration-ink">until here</button>
    </div>
  );
}
