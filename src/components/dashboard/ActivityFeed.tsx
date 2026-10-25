"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The latest thing that happened to each project, newest first: from the project's own status and step times. */
function lastEvent(p: Project) {
  const times = Object.values(p.steps).flatMap((s) => [s.finishedAt, s.startedAt]).filter((t): t is string => Boolean(t));
  const at = times.length ? Math.max(...times.map((t) => Date.parse(t))) : Date.parse(p.createdAt);
  const kind = p.workflow === "ad" ? "Ad" : "Translation";
  const text =
    p.status === "completed" ? `${kind} “${p.name}” is ready` :
    p.status === "failed" ? `${kind} “${p.name}” stopped` :
    p.status === "processing" ? `${kind} “${p.name}” is being made` :
    p.status === "review" ? `${kind} “${p.name}” is waiting for you` :
    `${kind} “${p.name}” saved as a draft`;
  return { at, text, tone: p.status };
}

function ago(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

const DOT: Record<string, string> = { completed: "bg-success", failed: "bg-danger", processing: "bg-warning", review: "bg-accent", draft: "bg-muted/50" };

export function ActivityFeed() {
  const projects = useProjects();
  const ready = useProjectsReady();
  const events = projects
    .filter((p) => !p.archivedAt)
    .map((p) => ({ id: p.id, ...lastEvent(p) }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);
  return (
    <section className="rise rounded-card bg-surface p-5 shadow-card" style={{ "--rise-delay": "440ms" } as CSSProperties} aria-labelledby="activity">
      <h2 id="activity" className="text-[16px] font-semibold text-ink">Activity</h2>
      {!ready ? (
        <div className="mt-4 space-y-3" aria-hidden>{[0, 1, 2].map((i) => <div key={i} className="shimmer h-9 rounded-control" />)}</div>
      ) : events.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-muted">Nothing yet. Start a video and every step shows up here.</p>
      ) : (
        <ol className="mt-3 space-y-1">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/projects/${e.id}`} className="focus-ring flex gap-3 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-surface-muted">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[e.tone] ?? "bg-muted")} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">{e.text}</span>
                  <span className="block text-[12px] text-muted">{ago(e.at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
