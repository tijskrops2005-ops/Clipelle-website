import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StepListItem = { title: ReactNode; text?: ReactNode };

/**
 * Compact numbered steps ("01 — Upload"), used above a form and on the landing page: mono
 * number, a short rule, title and one line of text. Horizontal from sm, stacked on phones.
 */
export function StepList({ items, columns, className }: { items: StepListItem[]; columns?: 3 | 4; className?: string }) {
  const cols = columns ?? (items.length >= 4 ? 4 : 3);
  return (
    <ol className={cn("grid gap-3", cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item, i) => (
        <li key={i} className="panel flex flex-col gap-2 px-4 py-4">
          <span className="flex items-center gap-2.5">
            <span className="label-mono text-muted">{String(i + 1).padStart(2, "0")}</span>
            <span className="h-px w-5 bg-divider" aria-hidden />
            <span className="text-sm font-semibold text-ink">{item.title}</span>
          </span>
          {item.text && <span className="text-[13px] leading-relaxed text-muted">{item.text}</span>}
        </li>
      ))}
    </ol>
  );
}
