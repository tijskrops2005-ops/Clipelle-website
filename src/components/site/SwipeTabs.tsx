"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tabs whose panels sit side by side in one scroll-snap track (25 Oct 2026, the "Why Clipelle" block):
 * swipe on a phone or trackpad, or pick a tab; the tab follows the panel in view. Arrow keys move
 * between tabs. Under "reduce motion" the jump is instant.
 */
export function SwipeTabs({ tabs, hint, className }: { tabs: { key: string; label: string; content: ReactNode }[]; hint?: string; className?: string }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const base = useId();

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    const next = (i + tabs.length) % tabs.length;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = next * el.clientWidth;
    el.scrollTo({ left, behavior: reduce || document.visibilityState !== "visible" ? "auto" : "smooth" });
    // Safety net: if a smooth scroll is interrupted, land on the panel anyway.
    window.setTimeout(() => { if (Math.abs(el.scrollLeft - left) > 4) el.scrollTo({ left, behavior: "auto" }); }, 700);
    setActive(next);
    document.getElementById(`${base}-tab-${next}`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function onScroll() {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    go(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => go(active - 1)} aria-label="Previous" className="focus-ring hidden size-10 place-items-center rounded-full border border-border bg-surface text-muted shadow-soft transition-colors hover:text-ink sm:grid">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <div role="tablist" aria-label="Sections" onKeyDown={onKeyDown} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-muted p-1 [scrollbar-width:none]">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              id={`${base}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={active === i}
              aria-controls={`${base}-panel-${i}`}
              tabIndex={active === i ? 0 : -1}
              onClick={() => go(i)}
              className={cn("focus-ring h-10 shrink-0 whitespace-nowrap rounded-full px-3 text-[13px] font-medium sm:px-4 sm:text-[14px] transition-[background-color,color,box-shadow] duration-150", active === i ? "bg-ink text-surface shadow-soft" : "text-muted hover:text-ink")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => go(active + 1)} aria-label="Next" className="focus-ring hidden size-10 place-items-center rounded-full border border-border bg-surface text-muted shadow-soft transition-colors hover:text-ink sm:grid">
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div ref={track} onScroll={onScroll} className="-mx-3 mt-8 flex snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <div key={t.key} id={`${base}-panel-${i}`} role="tabpanel" aria-labelledby={`${base}-tab-${i}`} className="w-full shrink-0 snap-start px-3 pb-4 pt-1">
            {t.content}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2" aria-hidden>
        {tabs.map((t, i) => (
          <span key={t.key} className={cn("h-1.5 rounded-full transition-[width,background-color] duration-200", active === i ? "w-6 bg-ink" : "w-1.5 bg-border")} />
        ))}
        {hint && <span className="ml-2 text-[12px] text-muted sm:hidden">{hint}</span>}
      </div>
    </div>
  );
}
