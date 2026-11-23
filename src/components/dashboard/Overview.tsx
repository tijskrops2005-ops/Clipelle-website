"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Coins } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { planLabel, type Plan } from "@/lib/plans";
import { CREDIT_RULE, projectsThisMonth } from "@/lib/projectCredits";
import { useClock } from "@/lib/useClock";
import { CountUp } from "@/components/motion/CountUp";
import { DemoBadge } from "@/components/DemoModeBadge";

type Props = { credits: number | null; plan: Plan | null; demo: boolean };

/**
 * Top of the dashboard (31 Oct 2026: one line instead of a strip and three cards). The balance from
 * the credit ledger as the one moving number (mono, tabular), the plan, what a credit is, this
 * month's count from your own projects, and one quiet link to more. Credits only (23 Nov 2026): no
 * minutes, and demo mode shows the demo balance with its badge instead of a dash.
 */
export function Overview({ credits, plan, demo }: Props) {
  const projects = useProjects();
  const ready = useProjectsReady();
  // Null in the server HTML and during hydration, so both agree; the count appears with the clock.
  const now = useClock(60_000);
  const paid = Boolean(plan && plan.monthlyUsd > 0);
  const thisMonth = now === null ? null : projectsThisMonth(projects, now);
  const running = projects.filter((p) => !p.archivedAt && (p.status === "processing" || p.status === "review")).length;

  return (
    <section className="rise flex flex-col gap-4 rounded-card bg-surface px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ "--rise-delay": "0ms" } as CSSProperties} aria-label="Credits and plan">
      <div className="flex items-center gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Coins className="size-[18px]" aria-hidden /></span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
            <span>
              {credits === null ? "—" : <CountUp value={credits} />}
              <span className="ml-1.5 font-sans text-[14px] font-medium text-muted">credits</span>
            </span>
            {demo && <DemoBadge>Demo</DemoBadge>}
          </p>
          <p className="mt-1.5 text-[13px] text-muted">
            {plan ? planLabel(plan) : "Free"} plan · {CREDIT_RULE}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <p className="text-[13px] text-muted tabular-nums">
          {ready && thisMonth !== null ? `${thisMonth} ${thisMonth === 1 ? "project" : "projects"} this month` : " "}
          {ready && running > 0 && <span> · {running} running</span>}
        </p>
        <Link href="/settings/billing" className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-control text-[13px] font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">
          {paid ? "Buy more credits" : "See plans"} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
