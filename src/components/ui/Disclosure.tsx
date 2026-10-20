"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline fold inside a card, for "Advanced options". A bordered row with a chevron; the content
 * stays mounted while hidden so typed values survive folding.
 */
export function Disclosure({ title, summary, defaultOpen = false, forceOpen, children, className }: { title: ReactNode; summary?: ReactNode; defaultOpen?: boolean; /** Opens the fold from outside, e.g. when a field inside has an error. */ forceOpen?: boolean; children: ReactNode; className?: string }) {
  const [openState, setOpen] = useState(defaultOpen);
  const open = openState || Boolean(forceOpen);
  const id = useId();
  return (
    <div className={cn("rounded-panel border border-border", open && "bg-surface", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex w-full items-center justify-between gap-3 rounded-panel px-4 py-3.5 text-left transition-colors duration-150 hover:bg-surface-muted/60"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {summary && <span className="mt-0.5 block text-[13px] text-muted">{summary}</span>}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      <div id={id} hidden={!open} className={cn("space-y-6 border-t border-divider px-4 pb-5 pt-5", open && "fold-in")}>
        {children}
      </div>
    </div>
  );
}
