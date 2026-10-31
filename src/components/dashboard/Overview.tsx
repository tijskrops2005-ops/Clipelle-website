"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Coins } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { planLabel, type Plan } from "@/lib/plans";
import { CountUp } from "@/components/motion/CountUp";
import { DemoBadge } from "@/components/DemoModeBadge";

/** Credits as minutes of Speed translation: "4.8 minutes", "22 minutes". */
function translationMinutes(credits: number) {
  const min = credits / 60;
  if (min < 1) return `${credits} seconds`;
  return `${min < 10 ? Math.round(min * 10) / 10 : Math.round(min)} minutes`;
}

type Props = { credits: number | null; plan: Plan | null; demo: boolean };

/**
 * Top of the dashboard (31 Oct 2026: one line instead of a strip and three cards). The balance from
 * the credit ledger as the one moving number (mono, tabular), what it buys, the plan, this month's
 * count from your own projects, and the one way to get more. Nothing decorative.
 */
export function Overview({ credits, plan, demo }: Props) {
  const projects = useProjects();
  const ready = useProjectsReady();
  const paid = Boolean(plan && plan.monthlyUsd > 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  // Archived projects (old tests) stay out of the counts, as they stay out of the Projects list.
  const current = projects.filter((p) => !p.archivedAt);
  const thisMonth = current.filter((p) => Date.parse(p.createdAt) >= monthStart.getTime());
  const running = current.filter((p) => p.status === "processing" || p.status === "review").length;

  return (
    <section className="rise flex flex-col gap-4 rounded-card bg-surface px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ "--rise-delay": "0ms" } as CSSProperties} aria-label="Credits and plan">
      <div className="flex items-center gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Coins className="size-[18px]" aria-hidden /></span>
        <div className="min-w-0">
          <p className="font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
            {credits === null ? "—" : <CountUp value={credits} />}
            <span className="ml-1.5 font-sans text-[14px] font-medium text-muted">credits</span>
          </p>
          <p className="mt-1.5 text-[13px] text-muted">
            {credits === null ? (
              <>Shown once your account is connected. {demo && <DemoBadge>Demo</DemoBadge>}</>
            ) : (
              <>About {translationMinutes(credits)} of translation · {plan ? planLabel(plan) : "Free"}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <p className="text-[13px] text-muted tabular-nums">
          {ready ? `${thisMonth.length} ${thisMonth.length === 1 ? "video" : "videos"} this month` : " "}
          {ready && running > 0 && <span> · {running} running</span>}
        </p>
        <Link href="/settings/billing" className="focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-ink px-3.5 text-[13px] font-medium text-surface transition-transform duration-150 hover:-translate-y-px">
          {paid ? "Buy more credits" : "Upgrade"} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
