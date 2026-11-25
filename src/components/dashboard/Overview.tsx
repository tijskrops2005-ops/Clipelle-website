"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { planLabel, type Plan } from "@/lib/plans";
import { projectsThisMonth } from "@/lib/projectCredits";
import { useClock } from "@/lib/useClock";
import { CountUp } from "@/components/motion/CountUp";

type Props = { credits: number | null; plan: Plan | null; demo: boolean };

/**
 * Top of the dashboard (31 Oct 2026: one line instead of a strip and three cards). The balance from
 * the credit ledger as the one moving number (mono, tabular), the plan, what a credit is, this
 * month's count from your own projects, and one quiet link to more. What a credit is lives on
 * Billing (23 Nov 2026, docs/design-clarity.md); demo mode says "demo" in one word.
 */
export function Overview({ credits, plan, demo }: Props) {
  const projects = useProjects();
  const ready = useProjectsReady();
  // Null in the server HTML and during hydration, so both agree; the count appears with the clock.
  const now = useClock(60_000);
  const paid = Boolean(plan && plan.monthlyUsd > 0);
  const thisMonth = now === null ? null : projectsThisMonth(projects, now);

  return (
    <section className="rise flex flex-col gap-3 rounded-card bg-surface px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ "--rise-delay": "0ms" } as CSSProperties} aria-label="Credits and plan">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
          {credits === null ? "—" : <CountUp value={credits} />}
          <span className="ml-1.5 font-sans text-[14px] font-medium text-muted">credits</span>
        </span>
        <span className="text-[13px] text-muted">{plan ? planLabel(plan) : "Free"} plan{demo ? " · demo" : ""}</span>
      </p>
      <p className="flex items-center justify-between gap-5 text-[13px] text-muted tabular-nums sm:justify-end">
        <span>{ready && thisMonth !== null ? `${thisMonth} ${thisMonth === 1 ? "project" : "projects"} this month` : " "}</span>
        <Link href="/app/settings/billing" className="focus-ring shrink-0 rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">
          {paid ? "Buy credits" : "See plans"}
        </Link>
      </p>
    </section>
  );
}
