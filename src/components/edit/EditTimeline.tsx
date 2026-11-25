"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Scissors, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { keptRanges, MIN_PIECE_SECONDS, timelinePieces, type EditRecipe, type Piece } from "@/lib/editRecipe";
import { formatDuration } from "@/components/ui/VideoDropzone";

const THUMBS = 12;

/**
 * The timeline of the edit screen (2 Nov 2026): a strip of frames from the video (drawn with a
 * canvas when the browser may read the frames; plain blocks otherwise), the playhead, the kept
 * window as two handles, and the removed parts in red. Taking a piece out of the middle works as in
 * a phone editor (26 Nov 2026, Tijs could not find it): "Split" at the playhead, tap the part, "Delete
 * part"; the rest of the video stays. A removed part comes back with Restore.
 */
export function EditTimeline({ src, recipe, time, onSeek, onRecipe, disabled }: { src: string; recipe: EditRecipe; time: number; onSeek: (t: number) => void; onRecipe: (next: EditRecipe) => void; disabled?: boolean }) {
  const total = recipe.sourceSeconds;
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [splits, setSplits] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
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
  const pieces = timelinePieces(recipe, splits);
  const sel = selected !== null ? pieces.find((p) => Math.abs(p.start - selected) < 0.05) ?? null : null;

  function split() {
    const t = Math.round(time * 10) / 10;
    if (t <= recipe.trim.start + MIN_PIECE_SECONDS / 2 || t >= recipe.trim.end - MIN_PIECE_SECONDS / 2) return;
    if (splits.some((s) => Math.abs(s - t) < 0.1)) return;
    setSplits([...splits, t]);
    // The part after the split is selected: the usual next step is to delete it or split again.
    setSelected(t);
  }
  function deletePiece(p: Piece) {
    if (p.state !== "kept" || p.end - p.start < MIN_PIECE_SECONDS / 2) return;
    // A part at the start or end of the kept window moves the trim; one in the middle becomes a cut.
    if (Math.abs(p.start - recipe.trim.start) < 0.05 && p.end < recipe.trim.end - 0.05) setTrim(p.end, recipe.trim.end);
    else if (Math.abs(p.end - recipe.trim.end) < 0.05 && p.start > recipe.trim.start + 0.05) setTrim(recipe.trim.start, p.start);
    else onRecipe({ ...recipe, cuts: [...recipe.cuts, { start: p.start, end: p.end }] });
    setSelected(null);
  }
  function removeCut(i: number) {
    onRecipe({ ...recipe, cuts: recipe.cuts.filter((_, j) => j !== i) });
  }
  function selectPiece(p: Piece) {
    setSelected(p.start);
    onSeek(Math.round(((p.start + p.end) / 2) * 10) / 10);
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
        {splits.filter((t) => t > recipe.trim.start && t < recipe.trim.end).map((t) => (
          <div key={t} className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: pct(t) }} aria-hidden />
        ))}
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
      {/* the parts: tap one to select it, then delete it; the rest of the video stays */}
      <div className="relative flex h-9 gap-px overflow-hidden rounded-[10px]" role="listbox" aria-label="Parts of the video">
        {pieces.map((p) => {
          const isSel = sel?.start === p.start;
          return (
            <button
              key={`${p.start}-${p.end}`}
              type="button"
              role="option"
              aria-selected={isSel}
              disabled={disabled || p.state !== "kept"}
              onClick={() => selectPiece(p)}
              onKeyDown={(e) => { if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deletePiece(p); } }}
              style={{ width: `${((p.end - p.start) / total) * 100}%` }}
              title={`${formatDuration(p.start)}–${formatDuration(p.end)}`}
              className={cn(
                "focus-ring min-w-[3px] text-[11.5px] tabular-nums transition-colors",
                p.state === "kept" && (isSel ? "bg-accent text-white" : "bg-surface-muted text-muted hover:bg-ink/10 hover:text-ink"),
                p.state === "cut" && "bg-danger/15 text-danger [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgba(220,38,38,0.18)_6px_8px)]",
                p.state === "out" && "bg-ink/5",
              )}
            >
              <span className="sr-only">{p.state === "kept" ? "Part" : "Removed part"} </span>
              {(p.end - p.start) / total > 0.12 ? formatDuration(p.end - p.start) : null}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={split} disabled={disabled}>
          <Scissors className="size-4" aria-hidden />
          Split
        </Button>
        <Button type="button" variant={sel ? "danger" : "secondary"} size="sm" onClick={() => sel && deletePiece(sel)} disabled={disabled || !sel}>
          <Trash2 className="size-4" aria-hidden />
          Delete part
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-divider sm:block" aria-hidden />
        <Button type="button" variant="ghost" size="sm" onClick={() => setTrim(time, recipe.trim.end)} disabled={disabled}>Start here</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setTrim(recipe.trim.start, time)} disabled={disabled}>End here</Button>
      </div>
      <p className="text-[13px] text-muted">{sel ? `Selected ${formatDuration(sel.start)}–${formatDuration(sel.end)}. Delete it and the rest stays.` : "Move the playhead, Split, then tap a part to delete it."}</p>
      {recipe.cuts.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {recipe.cuts.map((c, i) => (
            <li key={i} className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pl-3 pr-1 text-[13px] text-ink")}>
              Removed {formatDuration(c.start)}–{formatDuration(c.end)}
              <button type="button" onClick={() => removeCut(i)} disabled={disabled} aria-label={`Restore ${formatDuration(c.start)}–${formatDuration(c.end)}`} title="Restore" className="focus-ring grid size-6 place-items-center rounded-full text-muted hover:bg-ink/10 hover:text-ink"><RotateCcw className="size-3.5" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
