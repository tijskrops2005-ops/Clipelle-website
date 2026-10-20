"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type CollapsibleProps = {
  title: ReactNode;
  /** One line next to the title, e.g. "4 steps completed". */
  summary?: ReactNode;
  /** Right-aligned element in the header row (badge, link). */
  aside?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * A section that folds away. Used on the project page once a video is ready: the result stays
 * on top, the pipeline and the details sit underneath and open on request.
 */
export function Collapsible({ title, summary, aside, defaultOpen = false, children, className }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={cn("space-y-5", className)}>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="group flex min-w-0 items-center gap-3 rounded-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card transition-transform group-hover:-translate-y-px">
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-semibold text-ink">{title}</span>
            {summary && <span className="mt-0.5 block text-[15px] text-muted">{summary}</span>}
          </span>
        </button>
        {aside}
      </div>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
