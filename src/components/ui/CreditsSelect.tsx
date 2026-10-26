"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreditsOption = { key: string; label: string; hint?: string };

/**
 * The credits of a plan as one dropdown (26 Oct 2026, after Creatomate's credit picker, our own look):
 * a button with the chosen amount; a click opens the levels with their price. Keyboard: arrows,
 * Enter, Escape; a click outside closes it. With one option it is a plain, non-clickable box.
 */
export function CreditsSelect({ label, options, value, onChange }: { label: string; options: CreditsOption[]; value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = options.find((o) => o.key === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const box = "flex h-11 w-full items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-left text-[14px] font-semibold text-ink";
  if (options.length < 2) return <div className={box}><Coins className="size-4 shrink-0 text-accent" aria-hidden />{current?.label}</div>;

  function openAt(i: number) {
    setActive(i);
    setOpen(true);
  }
  function pick(i: number) {
    onChange(options[i].key);
    setOpen(false);
    button.current?.focus();
  }
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${current.label}`}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openAt(Math.max(0, options.indexOf(current))))}
        onKeyDown={(e) => {
          const i = options.indexOf(current);
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openAt(i);
            return;
          }
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(options.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick(active);
          } else if (e.key === "Escape" || e.key === "Tab") {
            setOpen(false);
          }
        }}
        className={cn(box, "focus-ring transition-[border-color,box-shadow] duration-150 hover:border-ink/40", open && "border-ink")}
      >
        <Coins className="size-4 shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{current.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="fold-in absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-control border border-border bg-surface py-1 shadow-card-hover">
          {options.map((o, i) => {
            const selected = o.key === current.key;
            return (
              <li
                key={o.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={cn("flex cursor-pointer items-center gap-2 px-3 py-2.5 text-[13.5px]", i === active && "bg-surface-muted")}
              >
                <Check className={cn("size-4 shrink-0", selected ? "text-ink" : "text-transparent")} aria-hidden />
                <span className={cn("flex-1 whitespace-nowrap", selected ? "font-semibold text-ink" : "text-ink")}>{o.label}</span>
                {o.hint && <span className="whitespace-nowrap text-[13px] text-muted">{o.hint}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
