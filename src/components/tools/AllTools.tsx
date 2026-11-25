"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_TOOLS, TOOL_CATEGORIES, type ToolCategory } from "@/components/tools";
import { ToolCard } from "./ToolCard";

/**
 * The All tools page (25 Nov 2026, Tijs: "make every tool easy to find"): a search, chips per
 * category, and the tools grouped by category with the category's colour. Grouping by what the
 * tool does keeps a growing list calm; announced tools sit with their category, marked "Soon".
 */
export function AllTools() {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<ToolCategory | "all">("all");
  const needle = q.trim().toLowerCase();
  const tools = useMemo(() => ALL_TOOLS.filter((t) => !needle || `${t.label} ${t.text} ${(t.chips ?? []).join(" ")}`.toLowerCase().includes(needle)), [needle]);
  const groups = TOOL_CATEGORIES.filter((c) => only === "all" || c.key === only)
    .map((c) => ({ ...c, tools: tools.filter((t) => t.category === c.key) }))
    .filter((g) => g.tools.length > 0);

  return (
    <div className="space-y-8">
      {/* Tabs with a line under the active one and a count (25 Nov 2026, Tijs: calmer than coloured pills). */}
      <div className="flex flex-col gap-4 border-b border-divider md:flex-row md:items-end md:justify-between">
        <div className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Category">
          {[{ key: "all" as const, label: "All" }, ...TOOL_CATEGORIES].map((c) => {
            const count = c.key === "all" ? ALL_TOOLS.length : ALL_TOOLS.filter((t) => t.category === c.key).length;
            const active = only === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setOnly(c.key)}
                className={cn(
                  "focus-ring inline-flex shrink-0 items-center gap-2 border-b-2 pb-3 text-[14px] transition-colors duration-150",
                  active ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {c.label}
                <span className={cn("text-[12px] tabular-nums", active ? "text-ink/60" : "text-muted/70")}>{count}</span>
              </button>
            );
          })}
        </div>
        <label className="mb-3 flex h-9 w-full items-center gap-2 rounded-full border border-border bg-surface px-3.5 md:w-64">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools" aria-label="Search tools" className="h-full w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted" />
        </label>
      </div>

      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`cat-${g.key}`}>
          <div className="mb-3 flex items-baseline gap-3">
            <h2 id={`cat-${g.key}`} className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{g.label}</h2>
            <p className="hidden text-[13.5px] text-muted sm:block">{g.text}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.tools.map((t) => (
              <li key={t.key}><ToolCard tool={t} /></li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="py-16 text-center text-[14px] text-muted">No tool matches “{q}”.</p>}
    </div>
  );
}
