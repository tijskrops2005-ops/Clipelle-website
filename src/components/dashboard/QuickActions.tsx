"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { STUDIO_TOOLS, openToolSearch } from "@/components/tools";

/** The studio tools as one row of pills (31 Oct 2026, was a card of tiles): one click to the form. */
export function QuickActions() {
  return (
    <nav className="rise flex flex-wrap items-center gap-2" style={{ "--rise-delay": "320ms" } as CSSProperties} aria-label="Quick actions">
      {STUDIO_TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <Link key={t.key} href={t.href} className="focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-[13.5px] font-medium text-ink transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-card">
            <Icon className="size-4 text-accent" aria-hidden />
            {t.label}
          </Link>
        );
      })}
      <button type="button" onClick={openToolSearch} className="focus-ring inline-flex h-10 items-center gap-1 rounded-full px-3 text-[13px] text-muted transition-colors duration-150 hover:text-ink">
        All tools <ArrowRight className="size-3.5" aria-hidden />
      </button>
    </nav>
  );
}
