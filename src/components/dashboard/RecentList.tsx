"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { languageOf } from "@/lib/languages";
import { projectLengthLabel, projectMonogram, projectPosterUrl } from "@/lib/projectMeta";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Poster } from "@/components/Poster";
import { Skeleton } from "@/components/ui/Skeleton";

const LIMIT = 6;

/**
 * Recent videos as a list (24 Nov 2026, Tijs, after splister.com/app): a small 9:16 frame, the name,
 * the languages and the date, the status. Six rows; the full grid is on Projects. Rows replaced the
 * big tiles, which showed four videos per screen.
 */
export function RecentList() {
  const projects = useProjects().filter((p) => !p.archivedAt).slice(0, LIMIT);
  const ready = useProjectsReady();
  return (
    <section aria-labelledby="recent" className="min-w-0 rounded-card bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <h2 id="recent" className="text-[17px] font-semibold text-ink">Recent videos</h2>
        <Link href="/projects" className="focus-ring rounded-control text-[13px] font-medium text-muted hover:text-ink">View all</Link>
      </div>
      {!ready ? (
        <div className="space-y-3 p-5 sm:p-6">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="text-[15px] text-muted">Your videos appear here.</p>
          <Button href="/new/translate" variant="primary"><Plus className="size-4" aria-hidden />Translate a video</Button>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-divider px-2 pb-2 sm:px-3">
          {projects.map((p) => <Row key={p.id} project={p} />)}
        </ul>
      )}
    </section>
  );
}

function Row({ project: p }: { project: Project }) {
  const poster = projectPosterUrl(p);
  const frame = !poster && p.workflow === "translate" ? p.translations.find((t) => t.videoUrl)?.videoUrl ?? p.sourceVideoUrl : undefined;
  const what = p.workflow === "translate" ? p.targetLanguages.map((l) => languageOf(l).label).join(", ") : p.productName;
  return (
    <li>
      <Link href={`/projects/${p.id}`} className="focus-ring group flex items-center gap-4 rounded-[14px] px-3 py-3 transition-colors duration-150 hover:bg-surface-muted/70">
        <span className="relative block aspect-[9/16] w-10 shrink-0 overflow-hidden rounded-[8px] bg-surface-muted">
          <Poster seed={p.id} monogram={projectMonogram(p)} imageUrl={poster} className="!text-[11px]" />
          {frame && <video src={`${frame}#t=0.5`} muted playsInline preload="metadata" aria-hidden tabIndex={-1} className="pointer-events-none absolute inset-0 size-full object-cover" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink">{p.name}</span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">{what} · {formatDate(p.createdAt)}</span>
        </span>
        <span className="hidden shrink-0 text-[13px] tabular-nums text-muted sm:block">{projectLengthLabel(p)}</span>
        {p.status === "completed" && p.creditsUsed !== undefined && <span className="hidden shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-medium tabular-nums text-accent md:inline">{p.creditsUsed} credits</span>}
        <StatusBadge status={p.status} className="shrink-0" />
        <ChevronRight className="size-4 shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}
