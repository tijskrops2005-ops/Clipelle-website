"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Languages, Sparkles } from "lucide-react";
import { useProjects } from "@/lib/data/client";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "Now creating" on the dashboard (25 Oct 2026): every video that is being made right now, with
 * the step it is in, a progress bar and how long it has been running, each linking to its project
 * page. Hidden when nothing runs. Reads the same project list as the rest of the app.
 */

const AD_STEPS: { key: string; title: string }[] = [
  { key: "script", title: "Script" },
  { key: "productClip", title: "Product clip" },
  { key: "presenter", title: "AI presenter" },
  { key: "finalEdit", title: "Final edit" },
];
const TRANSLATE_STEPS: { key: string; title: string }[] = [
  { key: "upload", title: "Upload" },
  { key: "translate", title: "Translate" },
  { key: "captions", title: "Captions and 9:16" },
];

function progressOf(p: Project) {
  const order = p.workflow === "ad" ? AD_STEPS : TRANSLATE_STEPS;
  const steps = p.steps as Record<string, { status: string; startedAt?: string } | undefined>;
  const done = order.filter((s) => steps[s.key]?.status === "completed").length;
  // The step to show: one waiting for the customer first, then the running ones (product clip and presenter run side by side).
  const waiting = order.find((s) => steps[s.key]?.status === "needs_input");
  const running = order.filter((s) => steps[s.key]?.status === "processing");
  const current = waiting ?? running[running.length - 1] ?? order[Math.min(done, order.length - 1)];
  const label = waiting ? `${waiting.title} · waiting for you` : running.length > 1 ? running.map((s) => s.title).join(" + ") : current.title;
  const started = Object.values(steps).map((s) => s?.startedAt).filter((t): t is string => Boolean(t)).map((t) => Date.parse(t));
  return { done, total: order.length, step: order.indexOf(current) + 1, label, waiting: Boolean(waiting), since: started.length ? Math.min(...started) : Date.parse(p.createdAt) };
}

function running(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return "just started";
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function NowCreating() {
  const projects = useProjects().filter((p) => !p.archivedAt && (p.status === "processing" || p.status === "review"));
  // Re-render every 15 s so "running for" stays current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (projects.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [projects.length]);

  if (projects.length === 0) return null;
  return (
    <section aria-labelledby="now-creating" className="rounded-card bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="now-creating" className="flex items-center gap-2.5 text-[17px] font-semibold text-ink">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
          Now creating
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[12px] font-medium text-muted">{projects.length}</span>
        </h2>
        <Link href="/projects?status=processing" className="focus-ring inline-flex items-center gap-1 rounded-control text-[13px] font-medium text-muted hover:text-ink">
          All in progress <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-divider">
        {projects.map((p) => {
          const g = progressOf(p);
          const Icon = p.workflow === "ad" ? Sparkles : Languages;
          return (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="focus-ring group -mx-2 flex items-center gap-4 rounded-[14px] px-2 py-3 hover:bg-surface-muted/60">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent"><Icon className="size-[18px]" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold text-ink">{p.name}</span>
                    <span className="shrink-0 text-[12.5px] text-muted">{p.workflow === "ad" ? "Ad" : "Translation"} · {running(now - g.since)}</span>
                  </span>
                  <span className={cn("mt-0.5 block truncate text-[13px]", g.waiting ? "text-warning" : "text-muted")}>
                    Step {g.step} of {g.total} · {g.label}
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(6, (g.done / g.total) * 100)}%` }} />
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
