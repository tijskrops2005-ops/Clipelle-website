"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Coins } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { adCredits, planLabel, type Plan } from "@/lib/plans";
import { CountUp } from "@/components/motion/CountUp";
import { ProgressRing } from "@/components/motion/ProgressRing";
import { DemoBadge } from "@/components/DemoModeBadge";
import { cn } from "@/lib/utils";

/** One credit is one second of translated video (Speed); a 30-second Standard ad uses 60 (src/lib/plans.ts). */
const REFERENCE_AD_SECONDS = 30;
const REFERENCE_AD_CREDITS = adCredits({ seconds: REFERENCE_AD_SECONDS, engine: "avatar_iii" });

/** Credits as minutes of Speed translation: "4.8 minutes", "22 minutes". */
function translationMinutes(credits: number) {
  const min = credits / 60;
  if (min < 1) return `${credits} seconds`;
  return `${min < 10 ? Math.round(min * 10) / 10 : Math.round(min)} minutes`;
}

type Props = { credits: number | null; plan: Plan | null; demo: boolean };

/**
 * Top of the dashboard (layout after getvidforge.com, our own data): a credit strip and three stat
 * cards. Everything is real: the balance from the credit ledger, the plan, and counts from your own
 * projects. Cards rise in once, numbers count up, the ring draws and the bars grow.
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
  const done = thisMonth.filter((p) => p.status === "completed").length;
  const running = current.filter((p) => p.status === "processing" || p.status === "review").length;
  const days = lastSevenDays(current.map((p) => p.createdAt));
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const ringBase = paid && plan ? plan.creditsPerMonth : REFERENCE_AD_SECONDS;
  const ringValue = credits === null ? 0 : credits / Math.max(1, ringBase);

  return (
    <div className="space-y-4">
      {/* Credit strip */}
      <div className="rise flex flex-col gap-3 rounded-card bg-surface px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between" style={{ "--rise-delay": "0ms" } as CSSProperties}>
        <p className="flex items-center gap-3 text-[14px] text-muted">
          <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent"><Coins className="size-4" aria-hidden /></span>
          {credits === null ? (
            <span>Credits are shown here once your account is connected. {demo && <DemoBadge>Demo</DemoBadge>}</span>
          ) : (
            <span>
              You have <strong className="font-semibold text-ink">{credits.toLocaleString("en-US")}</strong> credits left
              <span className="hidden sm:inline"> · about {translationMinutes(credits)} of translated video</span>
            </span>
          )}
        </p>
        <Link href="/settings/billing" className="focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-control bg-ink px-3.5 text-[13px] font-medium text-surface transition-transform duration-150 hover:-translate-y-px sm:self-auto">
          {paid ? "Buy more credits" : "Upgrade"} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard delay={80} label="Credits">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">{credits === null ? "—" : <CountUp value={credits} />}</p>
              <p className="mt-2 text-[12.5px] text-muted">{credits === null ? "Not connected in demo mode" : paid ? `of ${plan!.creditsPerMonth.toLocaleString("en-US")} included each month` : `one minute of translation uses 60; a ${REFERENCE_AD_SECONDS}-second ad ${REFERENCE_AD_CREDITS}`}</p>
            </div>
            <ProgressRing value={ringValue} size={58} stroke={6} label={credits === null ? "Credits not available" : `${credits} credits`}>
              <Coins className="size-4 text-accent" aria-hidden />
            </ProgressRing>
          </div>
        </StatCard>

        <StatCard delay={160} label="Videos this month">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">{ready ? <CountUp value={thisMonth.length} /> : "—"}</p>
              <p className="mt-2 text-[12.5px] text-muted">{ready ? (running > 0 ? `${done} ready · ${running} in progress` : `${done} ready`) : "Loading…"}</p>
            </div>
            <div className="flex h-12 items-end gap-1" role="img" aria-label={`Videos started per day, last 7 days: ${days.map((d) => d.count).join(", ")}`}>
              {days.map((d, i) => (
                <div key={d.key} className="flex h-full w-3 flex-col justify-end">
                  <span
                    className={cn("bar-grow block w-full rounded-[3px]", d.count > 0 ? "bg-accent" : "bg-surface-muted")}
                    style={{ height: `${d.count > 0 ? Math.max(18, (d.count / maxDay) * 100) : 14}%`, "--bar-delay": `${300 + i * 60}ms` } as CSSProperties}
                    title={`${d.label}: ${d.count}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </StatCard>

        <StatCard delay={240} label="Plan">
          <p className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">{plan ? planLabel(plan) : "Free"}</p>
          <p className="mt-2 flex items-center justify-between gap-3 text-[12.5px] text-muted">
            <span>{plan?.creditsNote ?? "30 free credits"}</span>
            <Link href="/settings/billing" className="focus-ring shrink-0 rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Compare plans</Link>
          </p>
        </StatCard>
      </div>
    </div>
  );
}

function StatCard({ label, delay, children }: { label: string; delay: number; children: React.ReactNode }) {
  return (
    <section className="rise rounded-card bg-surface p-5 shadow-card" style={{ "--rise-delay": `${delay}ms` } as CSSProperties} aria-label={label}>
      <p className="mb-4 text-[13px] font-medium text-muted">{label}</p>
      {children}
    </section>
  );
}

/** Projects started on each of the last seven days (local time), oldest first. */
function lastSevenDays(createdAt: string[]) {
  const out: { key: string; label: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const count = createdAt.filter((c) => {
      const t = Date.parse(c);
      return t >= d.getTime() && t < next.getTime();
    }).length;
    out.push({ key: d.toISOString(), label: d.toLocaleDateString("en-GB", { weekday: "short" }), count });
  }
  return out;
}
