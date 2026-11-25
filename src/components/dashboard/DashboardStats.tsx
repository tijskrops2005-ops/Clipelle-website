"use client";

import { Clock3, Film, Languages, type LucideIcon } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { projectDurationMs } from "@/lib/projectMeta";
import { useClock } from "@/lib/useClock";


/** Ready times above three hours are a stuck or retried run, not a ready time; they are left out of the average. */
const PLAUSIBLE_MS = 3 * 60 * 60 * 1000;

/**
 * Three numbers about your videos (24 Nov 2026, after splister.com/app; credits moved to the welcome band on 25 Nov):
 * finished videos, language versions and the average time to ready. Every number comes from your own
 * projects and the credit ledger; nothing is estimated. "This month" appears once the clock runs, so
 * the server HTML and the browser agree.
 */
export function DashboardStats() {
  const projects = useProjects().filter((p) => !p.archivedAt);
  const ready = useProjectsReady();
  const now = useClock(60_000);

  const finished = projects.filter((p) => p.status === "completed");
  const monthStart = now === null ? null : new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const finishedThisMonth = monthStart === null ? null : finished.filter((p) => Date.parse(p.createdAt) >= monthStart).length;
  const versions = projects.flatMap((p) => (p.workflow === "translate" ? p.translations.filter((t) => t.status === "completed") : []));
  const languages = new Set(versions.map((t) => t.language)).size;
  const durations = finished.map(projectDurationMs).filter((ms): ms is number => ms !== undefined && ms < PLAUSIBLE_MS);
  const avgMinutes = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length / 60_000 : null;
  const avg = avgMinutes === null ? null : avgMinutes < 10 ? Math.round(avgMinutes * 10) / 10 : Math.round(avgMinutes);

  // 25 Nov 2026 (Tijs: less white space): the credits moved into the welcome band; the three numbers
  // about your videos share one card with dividers instead of three tall cards.
  return (
    <section aria-label="Your numbers" className="grid grid-cols-1 divide-y divide-divider rounded-card bg-surface shadow-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Stat icon={Film} label="Finished videos" value={ready ? finished.length : "—"} sub={finishedThisMonth === null || !ready ? " " : `${finishedThisMonth} this month`} />
      <Stat icon={Languages} label="Language versions" value={ready ? versions.length : "—"} sub={!ready ? " " : languages === 0 ? "None yet" : `In ${languages} ${languages === 1 ? "language" : "languages"}`} />
      <Stat icon={Clock3} label="Average time to ready" value={!ready || avg === null ? "—" : `${avg} min`} sub={!ready ? " " : durations.length === 0 ? "After your first video" : `Over ${durations.length} ${durations.length === 1 ? "video" : "videos"}`} />
    </section>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-muted text-ink" aria-hidden><Icon className="size-[18px]" /></span>
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{label}</p>
        <p className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{value}</span>
          <span className="truncate text-[12.5px] text-muted">{sub}</span>
        </p>
      </div>
    </div>
  );
}
