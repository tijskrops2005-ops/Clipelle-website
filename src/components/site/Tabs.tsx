"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Accessible tabs (role=tablist, arrow keys) for "What you can make"-style sections. */
export function Tabs({ tabs, className }: { tabs: { key: string; label: string; content: ReactNode }[]; className?: string }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const base = useId();
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.key === active);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    setActive(next.key);
    document.getElementById(`${base}-tab-${next.key}`)?.focus();
  }
  return (
    <div className={className}>
      <div role="tablist" aria-label="Sections" onKeyDown={onKeyDown} className="inline-flex flex-wrap gap-1 rounded-full bg-surface-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`${base}-tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={active === t.key}
            aria-controls={`${base}-panel-${t.key}`}
            tabIndex={active === t.key ? 0 : -1}
            onClick={() => setActive(t.key)}
            className={cn("focus-ring h-10 rounded-full px-4 text-sm font-medium transition-[background-color,color,box-shadow] duration-150", active === t.key ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} id={`${base}-panel-${t.key}`} role="tabpanel" aria-labelledby={`${base}-tab-${t.key}`} hidden={active !== t.key} className={cn("mt-8", active === t.key && "fold-in")}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
