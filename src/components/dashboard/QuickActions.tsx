"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { STUDIO_TOOLS, openToolSearch } from "@/components/tools";

/** The studio tools as big tiles: one click to the form. "All tools" opens the search with what is coming soon. */
export function QuickActions() {
  return (
    <section className="rise rounded-card bg-surface p-5 shadow-card sm:p-6" style={{ "--rise-delay": "320ms" } as CSSProperties} aria-labelledby="quick-actions">
      <div className="flex items-center justify-between gap-3">
        <h2 id="quick-actions" className="text-[16px] font-semibold text-ink">Quick actions</h2>
        <button type="button" onClick={openToolSearch} className="focus-ring inline-flex items-center gap-1 rounded-control text-[13px] text-muted transition-colors duration-150 hover:text-ink">
          All tools <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STUDIO_TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.key}>
              <Link href={t.href} className="focus-ring group flex h-full flex-col items-center gap-3 rounded-panel border border-border bg-bg px-3 py-5 text-center transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-surface hover:shadow-card">
                <span className="grid size-11 place-items-center rounded-[12px] bg-accent-soft text-accent ring-1 ring-accent/10 transition-transform duration-200 group-hover:scale-110">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-[13.5px] font-semibold leading-tight text-ink">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
