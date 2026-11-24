"use client";

import Link from "next/link";
import { Clock3, Coins, Film, Languages, type LucideIcon } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { planLabel, type Plan } from "@/lib/plans";
import { projectDurationMs } from "@/lib/projectMeta";
import { useClock } from "@/lib/useClock";
import { CountUp } from "@/components/motion/CountUp";

type Props = { credits: number | null; plan: Plan | null; demo: boolean };

/** Ready times above three hours are a stuck or retried run, not a ready time; they are left out of the average. */
const PLAUSIBLE_MS = 3 * 60 * 60 * 1000;

/**
 * Four numbers at the top of the dashboard (24 Nov 2026, Tijs, after splister.com/app): credits left,
 * finished videos, language versions and the average time to ready. Every number comes from your own
 * projects and the credit ledger; nothing is estimated. "This month" appears once the clock runs, so
 * the server HTML and the browser agree.
 */
export function DashboardStats({ credits, plan, demo }: Props) {
  const projects = useProjects().filter((p) => !p.archivedAt);
  const ready = useProjectsReady();
  const now = useClock(60_000);
  const paid = Boolean(plan && plan.monthlyUsd > 0);

  const finished = projects.filter((p) => p.status === "completed");
  const monthStart = now === null ? null : new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const finishedThisMonth = monthStart === null ? null : finished.filter((p) => Date.parse(p.createdAt) >= monthStart).length;
  const versions = projects.flatMap((p) => (p.workflow === "translate" ? p.translations.filter((t) => t.status === "completed") : []));
  const languages = new Set(versions.map((t) => t.language)).size;
  const durations = finished.map(projectDurationMs).filter((ms): ms is number => ms !== undefined && ms < PLAUSIBLE_MS);
  const avgMinutes = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length / 60_000 : null;
  const avg = avgMinutes === null ? null : avgMinutes < 10 ? Math.round(avgMinutes * 10) / 10 : Math.round(avgMinutes);

  return (
    <section aria-label="Your numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <Stat
        icon={Coins}
        label="Credits"
        value={credits === null ? "—" : <CountUp value={credits} />}
        sub={
          <>
            {plan ? planLabel(plan) : "Free"} plan{demo ? " · demo" : ""} ·{" "}
            <Link href="/settings/billing" className="focus-ring rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">
              {paid ? "Buy credits" : "See plans"}
            </Link>
          </>
        }
      />
      <Stat icon={Film} label="Finished videos" value={ready ? finished.length : "—"} sub={finishedThisMonth === null || !ready ? " " : `${finishedThisMonth} this month`} />
      <Stat icon={Languages} label="Language versions" value={ready ? versions.length : "—"} sub={!ready ? " " : languages === 0 ? "None yet" : `In ${languages} ${languages === 1 ? "language" : "languages"}`} />
      <Stat icon={Clock3} label="Average time to ready" value={!ready || avg === null ? "—" : `${avg} min`} sub={!ready ? " " : durations.length === 0 ? "After your first video" : `Over ${durations.length} ${durations.length === 1 ? "video" : "videos"}`} />
    </section>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card sm:p-6">
      {/* A small icon square per number, in the style of splister.com/app (24 Nov 2026, Tijs). */}
      <span className="grid size-10 place-items-center rounded-[12px] bg-accent-soft text-accent" aria-hidden><Icon className="size-[18px]" /></span>
      <p className="mt-5 text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{value}</p>
      <p className="mt-2 text-[13px] font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-[13px] leading-snug text-muted">{sub}</p>
    </div>
  );
}
