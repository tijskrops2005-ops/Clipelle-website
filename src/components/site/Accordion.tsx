"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** FAQ accordion: one open at a time, buttons with aria-expanded, content stays in the DOM. */
export function Accordion({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className={cn("divide-y divide-divider rounded-card bg-surface shadow-card", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const id = `${base}-${i}`;
        return (
          <div key={item.q}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={id}
              onClick={() => setOpen(isOpen ? null : i)}
              className="focus-ring flex w-full items-center justify-between gap-4 rounded-control px-6 py-5 text-left transition-colors duration-150 hover:bg-surface-muted/60"
            >
              <span className="text-[17px] font-semibold text-ink">{item.q}</span>
              <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />
            </button>
            <div id={id} hidden={!isOpen} className={cn("px-6 pb-6", isOpen && "fold-in")}>
              <p className="text-[15px] leading-relaxed text-muted">{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
