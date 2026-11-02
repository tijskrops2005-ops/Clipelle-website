"use client";

import { useEffect, useRef, useState } from "react";
import { Scissors, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { keptRanges, MIN_PIECE_SECONDS, type EditRecipe } from "@/lib/editRecipe";
import { formatDuration } from "@/components/ui/VideoDropzone";

const THUMBS = 12;

/**
 * The timeline of the edit screen (2 Nov 2026): a strip of frames from the video (drawn with a
 * canvas when the browser may read the frames; plain blocks otherwise), the playhead, the kept
 * window as two handles, and the cuts as dark blocks. "Cut from here" marks the in point at the
 * playhead, a second click the out point.
 */
export function EditTimeline({ src, recipe, time, onSeek, onRecipe, disabled }: { src: string; recipe: EditRecipe; time: number; onSeek: (t: number) => void; onRecipe: (next: EditRecipe) => void; disabled?: boolean }) {
  const total = recipe.sourceSeconds;
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [cutStart, setCutStart] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Frames for the strip: a hidden video seeks through the clip; a picture that cannot be read (no CORS headers) leaves plain blocks.
  useEffect(() => {
    let alive = true;
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.preload = "auto";
    v.src = src;
    const canvas = document.createElement("canvas");
    const out: string[] = [];
    async function grab() {
      try {
        await new Promise<void>((res, rej) => {
          v.onloadedmetadata = () => res();
          v.onerror = () => rej(new Error("load"));
        });
        canvas.width = 90;
        canvas.height = Math.round((90 * v.videoHeight) / Math.max(1, v.videoWidth)) || 160;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        for (let i = 0; i < THUMBS && alive; i++) {
          const t = Math.min(Math.max(0, v.duration - 0.1), ((i + 0.5) / THUMBS) * v.duration);
          await new Promise<void>((res, rej) => {
            v.onseeked = () => res();
            v.onerror = () => rej(new Error("seek"));
            v.currentTime = t;
          });
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          out.push(canvas.toDataURL("image/jpeg", 0.6));
          if (alive) setThumbs([...out]);
        }
      } catch {
        /* no frames: the strip stays plain */
      }
    }
    void grab();
    return () => {
      alive = false;
      v.removeAttribute("src");
      v.load();
    };
  }, [src]);

  function seekFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = stripRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(f * total * 10) / 10);
  }
  const pct = (t: number) => `${(Math.min(total, Math.max(0, t)) / total) * 100}%`;
  const kept = keptRanges(recipe);

  function setTrim(start: number, end: number) {
    const s = Math.max(0, Math.min(start, total - MIN_PIECE_SECONDS));
    const e = Math.min(total, Math.max(end, s + MIN_PIECE_SECONDS));
    onRecipe({ ...recipe, trim: { start: Math.round(s * 10) / 10, end: Math.round(e * 10) / 10 } });
  }
  function cutHere() {
    if (cutStart === null) {
      setCutStart(time);
      return;
    }
    const a = Math.min(cutStart, time);
    const b = Math.max(cutStart, time);
    setCutStart(null);
    if (b - a < MIN_PIECE_SECONDS) return;
    onRecipe({ ...recipe, cuts: [...recipe.cuts, { start: Math.round(a * 10) / 10, end: Math.round(b * 10) / 10 }] });
  }
  function removeCut(i: number) {
    onRecipe({ ...recipe, cuts: recipe.cuts.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
        <span className="tabular-nums text-ink">{formatDuration(time)} <span className="text-muted">/ {formatDuration(total)}</span></span>
        <span>Keeps {formatDuration(kept.reduce((s, r) => s + r.end - r.start, 0))}</span>
      </div>
      {/* the strip: frames, cuts, trim shade, playhead */}
      <div ref={stripRef} onPointerDown={(e) => !disabled && seekFromPointer(e)} onPointerMove={(e) => !disabled && e.buttons === 1 && seekFromPointer(e)} className="relative h-16 cursor-pointer select-none overflow-hidden rounded-[12px] bg-ink/90 touch-none" role="slider" aria-label="Position in the video" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.round(time)} tabIndex={0} onKeyDown={(e) => { if (e.key === "ArrowRight") onSeek(Math.min(total, time + 0.5)); if (e.key === "ArrowLeft") onSeek(Math.max(0, time - 0.5)); }}>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${THUMBS}, 1fr)` }} aria-hidden>
          {Array.from({ length: THUMBS }, (_, i) => (thumbs[i] ? <img key={i} src={thumbs[i]} alt="" className="size-full object-cover opacity-90" /> : <div key={i} className="size-full border-r border-white/10 bg-ink" />))}
        </div>
        <div className="absolute inset-y-0 left-0 bg-ink/70" style={{ width: pct(recipe.trim.start) }} aria-hidden />
        <div className="absolute inset-y-0 right-0 bg-ink/70" style={{ width: `${100 - (Math.min(total, recipe.trim.end) / total) * 100}%` }} aria-hidden />
        {recipe.cuts.map((c, i) => (
          <div key={i} className="absolute inset-y-0 bg-danger/60 backdrop-grayscale" style={{ left: pct(c.start), width: `${((c.end - c.start) / total) * 100}%` }} aria-hidden />
        ))}
        {cutStart !== null && <div className="absolute inset-y-0 w-0.5 bg-danger" style={{ left: pct(cutStart) }} aria-hidden />}
        <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" style={{ left: pct(time) }} aria-hidden />
      </div>
      {/* trim handles */}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[13px] text-muted">
          Start <span className="tabular-nums text-ink">{formatDuration(recipe.trim.start)}</span>
          <input type="range" min={0} max={total} step={0.1} value={recipe.trim.start} onChange={(e) => setTrim(Number(e.target.value), recipe.trim.end)} disabled={disabled} className="mt-1 w-full accent-ink" aria-label="Start of the kept part" />
        </label>
        <label className="text-right text-[13px] text-muted">
          End <span className="tabular-nums text-ink">{formatDuration(recipe.trim.end)}</span>
          <input type="range" min={0} max={total} step={0.1} value={recipe.trim.end} onChange={(e) => setTrim(recipe.trim.start, Number(e.target.value))} disabled={disabled} className="mt-1 w-full accent-ink" aria-label="End of the kept part" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setTrim(time, recipe.trim.end)} disabled={disabled}>Start here</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setTrim(recipe.trim.start, time)} disabled={disabled}>End here</Button>
        <Button type="button" variant={cutStart === null ? "secondary" : "primary"} size="sm" onClick={cutHere} disabled={disabled}>
          <Scissors className="size-4" aria-hidden />
          {cutStart === null ? "Cut from here" : `Cut until here (from ${formatDuration(cutStart)})`}
        </Button>
        {cutStart !== null && <Button type="button" variant="ghost" size="sm" onClick={() => setCutStart(null)}>Cancel</Button>}
      </div>
      {recipe.cuts.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {recipe.cuts.map((c, i) => (
            <li key={i} className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pl-3 pr-1 text-[13px] text-ink")}>
              Cut {formatDuration(c.start)}–{formatDuration(c.end)}
              <button type="button" onClick={() => removeCut(i)} disabled={disabled} aria-label={`Remove cut ${i + 1}`} className="focus-ring grid size-6 place-items-center rounded-full text-muted hover:bg-ink/10 hover:text-ink"><X className="size-3.5" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
