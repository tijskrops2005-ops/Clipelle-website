"use client";

import { forwardRef, useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Check, ChevronDown, Slash } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_GRID, colorLabel, hexToHsv, hsvToHex, normalizeHex } from "@/lib/colors";
import { isLightColor } from "@/lib/captionOptions";

/**
 * The one colour picker (2 Nov 2026, Tijs): a swatch that opens a small popover with a grid of
 * standard colours, the colours picked earlier on this page, and a custom area (hue slider, a
 * saturation/brightness square and a hex field). Fully keyboard-operable: arrows walk the grid,
 * Enter or Space picks, Escape closes and returns focus. Fits a 390 px screen. Used for every colour
 * choice in the app (captions, brand accent, presenter background, the edit screen, Settings → Brand).
 */
type Props = {
  id?: string;
  label: string;
  /** The colour as #RRGGBB, or null for "none" (only with `allowNone`). */
  value: string | null;
  onChange: (hex: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  /** A short remark next to the swatch, e.g. "Low contrast". */
  note?: ReactNode;
  className?: string;
};

/* Recent colours: the ones picked on this page, in memory only (never stored). Shared by every picker on the page. */
const RECENT_MAX = 8;
let recent: string[] = [];
const listeners = new Set<() => void>();
function remember(hex: string) {
  recent = [hex, ...recent.filter((c) => c !== hex)].slice(0, RECENT_MAX);
  for (const l of listeners) l();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getRecent = () => recent;
const EMPTY: string[] = [];
const getNone = () => EMPTY;

export function ColorPicker({ id, label, value, onChange, allowNone, noneLabel = "None", disabled, note, className }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const popId = `${id ?? reactId}-colours`;
  const recents = useSyncExternalStore(subscribe, getRecent, getNone);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    // Focus lands on the current colour in the grid (or the first swatch).
    const current = gridRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]') ?? gridRef.current?.querySelector<HTMLButtonElement>("button");
    current?.focus();
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(hex: string | null, close = true) {
    onChange(hex);
    if (hex) remember(hex);
    if (close) {
      setOpen(false);
      trigger.current?.focus();
    }
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
  }
  const current = value ? value.toUpperCase() : null;
  const name = current ? colorLabel(current) : noneLabel;

  // Focus leaving the picker (Tab onwards) closes it, so two popovers never stay open side by side.
  function onBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
  }
  return (
    <div ref={root} className={cn("relative", className)} onKeyDown={onKeyDown} onBlur={onBlur}>
      <span className="mb-2 block text-sm font-medium text-ink" id={`${popId}-label`}>
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={trigger}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popId : undefined}
          aria-labelledby={`${popId}-label`}
          aria-describedby={`${popId}-value`}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn("focus-ring inline-flex h-10 items-center gap-2.5 rounded-control border border-border bg-surface pl-1.5 pr-3 text-sm text-ink transition-colors hover:border-ink/40 disabled:opacity-60", open && "border-ink")}
        >
          <Swatch hex={current} size="md" />
          <span id={`${popId}-value`} className="min-w-[4.5rem] text-left">{name}</span>
          <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {note && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[12px] font-medium text-ink">{note}</span>}
      </div>

      {open && (
        <div id={popId} role="dialog" aria-label={`${label}: pick a colour`} className="fold-in absolute left-0 z-40 mt-2 w-[272px] max-w-[calc(100vw-2rem)] rounded-card bg-surface p-3 shadow-card-hover">
          <Grid ref={gridRef} label="Standard colours" colours={[...(allowNone ? [null] : []), ...COLOR_GRID.map((c) => c.hex)]} current={current} noneLabel={noneLabel} onPick={pick} />
          {recents.length > 0 && (
            <div className="mt-3">
              <p className="label-mono mb-1.5 text-muted">Recent</p>
              <Grid label="Recent colours" colours={recents} current={current} noneLabel={noneLabel} onPick={pick} />
            </div>
          )}
          <Custom current={current ?? "#D43F1B"} onPick={(hex) => pick(hex, false)} />
        </div>
      )}
    </div>
  );
}

function Swatch({ hex, size }: { hex: string | null; size: "sm" | "md" }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full border border-border", size === "md" ? "size-7" : "size-6")} style={hex ? { background: hex } : undefined} aria-hidden>
      {!hex && <Slash className="size-3.5 text-muted" />}
    </span>
  );
}

/** A grid of swatches as a radio group with roving focus: arrows move, Enter or Space picks. */
const Grid = forwardRef<HTMLDivElement, { label: string; colours: (string | null)[]; current: string | null; noneLabel: string; onPick: (hex: string | null) => void }>(function Grid({ label, colours, current, noneLabel, onPick }, ref) {
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from((e.currentTarget as HTMLDivElement).querySelectorAll<HTMLButtonElement>("button"));
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const cols = 8;
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowDown" ? i + cols : e.key === "ArrowUp" ? i - cols : e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : -1;
    if (next < 0 || next >= buttons.length) return;
    e.preventDefault();
    buttons[next].focus();
  }
  return (
    <div ref={ref} role="radiogroup" aria-label={label} onKeyDown={onKey} className="grid grid-cols-8 gap-1.5">
      {colours.map((hex, i) => {
        const active = (hex ?? null) === (current ?? null) || (hex !== null && current !== null && hex.toUpperCase() === current.toUpperCase());
        const title = hex ? colorLabel(hex) : noneLabel;
        return (
          <button
            key={`${hex ?? "none"}-${i}`}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={title}
            title={title}
            tabIndex={active || (current === null && i === 0) || (!colours.some((c) => c !== null && current !== null && c.toUpperCase() === current.toUpperCase()) && i === 0) ? 0 : -1}
            onClick={() => onPick(hex)}
            className={cn("focus-ring grid size-7 place-items-center rounded-full border transition-transform hover:scale-110", active ? "border-ink ring-2 ring-ink/20" : "border-border", !hex && "bg-surface")}
            style={hex ? { background: hex } : undefined}
          >
            {active ? <Check className={cn("size-3.5", !hex || isLightColor(hex) ? "text-ink" : "text-surface")} aria-hidden /> : !hex ? <Slash className="size-3.5 text-muted" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
});

/** Custom colour: a saturation/brightness square, a hue slider and a hex field; every change applies at once. */
function Custom({ current, onPick }: { current: string; onPick: (hex: string) => void }) {
  const [hsv, setHsv] = useState(() => hexToHsv(current));
  const [hexText, setHexText] = useState(current);
  const [bad, setBad] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  // Follow the colour chosen elsewhere (grid, recent): state adjusted during render, no effect.
  const [synced, setSynced] = useState(current);
  if (synced !== current) {
    setSynced(current);
    if (hsvToHex(hsv) !== current) {
      setHsv(hexToHsv(current));
      setHexText(current);
      setBad(false);
    }
  }
  function apply(next: { h?: number; s?: number; v?: number }) {
    const n = { h: next.h ?? hsv.h, s: Math.min(1, Math.max(0, next.s ?? hsv.s)), v: Math.min(1, Math.max(0, next.v ?? hsv.v)) };
    setHsv(n);
    const hex = hsvToHex(n);
    setHexText(hex);
    setBad(false);
    onPick(hex);
  }
  function fromPointer(e: PointerEvent<HTMLDivElement>) {
    const r = area.current!.getBoundingClientRect();
    apply({ s: (e.clientX - r.left) / r.width, v: 1 - (e.clientY - r.top) / r.height });
  }
  function onAreaKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === "ArrowRight") apply({ s: hsv.s + step });
    else if (e.key === "ArrowLeft") apply({ s: hsv.s - step });
    else if (e.key === "ArrowUp") apply({ v: hsv.v + step });
    else if (e.key === "ArrowDown") apply({ v: hsv.v - step });
    else return;
    e.preventDefault();
  }
  function onHex(text: string) {
    setHexText(text);
    const hex = normalizeHex(text);
    if (!hex) {
      setBad(text.trim().length > 0);
      return;
    }
    setBad(false);
    setHsv(hexToHsv(hex));
    onPick(hex);
  }
  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  return (
    <div className="mt-3 space-y-2">
      <p className="label-mono text-muted">Custom</p>
      <div
        ref={area}
        role="slider"
        aria-label="Saturation and brightness: arrows adjust, Shift for bigger steps"
        aria-valuenow={Math.round(hsv.v * 100)}
        aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        tabIndex={0}
        onKeyDown={onAreaKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && fromPointer(e)}
        className="focus-ring relative h-24 w-full cursor-crosshair touch-none rounded-[10px]"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})` }}
      >
        <span className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} aria-hidden />
      </div>
      <input type="range" min={0} max={360} step={1} value={Math.round(hsv.h)} onChange={(e) => apply({ h: Number(e.target.value) })} aria-label="Hue" className="hue-slider w-full" />
      <div className="flex items-center gap-2">
        <Swatch hex={normalizeHex(hexText) ?? hsvToHex(hsv)} size="sm" />
        <input value={hexText} onChange={(e) => onHex(e.target.value)} onBlur={() => !normalizeHex(hexText) && setHexText(hsvToHex(hsv))} maxLength={7} spellCheck={false} aria-label="Hex colour" aria-invalid={bad || undefined} className={cn("focus-ring h-9 w-28 rounded-control border bg-surface px-2.5 font-mono text-[13px] uppercase text-ink", bad ? "border-danger" : "border-border")} placeholder="#RRGGBB" />
        {bad && <span className="text-[12px] text-danger">Use #RRGGBB</span>}
      </div>
    </div>
  );
}
