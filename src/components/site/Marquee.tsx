import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A slow horizontal loop of items (logos, words). Pauses on hover; static under "reduce motion". */
export function Marquee({ items, className, ariaLabel, gap = "gap-10" }: { items: ReactNode[]; className?: string; ariaLabel: string; gap?: string }) {
  const doubled = [...items, ...items];
  return (
    <div className={cn("marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]", className)} aria-label={ariaLabel} role="list">
      <div className={cn("marquee-track py-2", gap)}>
        {doubled.map((item, i) => (
          <div key={i} role={i < items.length ? "listitem" : undefined} aria-hidden={i >= items.length || undefined} className="shrink-0">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
