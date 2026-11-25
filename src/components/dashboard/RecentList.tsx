"use client";

import Link from "next/link";
import { Download, Plus, Scissors } from "lucide-react";
import { downloadHref, useProjects, useProjectsReady } from "@/lib/data/client";
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
        <Link href="/app/projects" className="focus-ring rounded-control text-[13px] font-medium text-muted hover:text-ink">View all</Link>
      </div>
      {!ready ? (
        <div className="space-y-3 p-5 sm:p-6">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="text-[15px] text-muted">Your videos appear here.</p>
          <Button href="/app/new/translate" variant="primary"><Plus className="size-4" aria-hidden />Translate a video</Button>
        </div>
      ) : (
        <ul className="mt-2 space-y-0.5 px-2 pb-2 sm:px-3">
          {projects.map((p) => <Row key={p.id} project={p} />)}
        </ul>
      )}
    </section>
  );
}

/** The finished file a row can download directly: an ad's final video, else the first finished language. */
function finishedFile(p: Project): { url: string; language?: string } | null {
  if (p.status !== "completed") return null;
  if (p.workflow === "ad") return p.finalVideoUrl ? { url: p.finalVideoUrl } : null;
  const t = p.translations.find((x) => x.status === "completed" && x.videoUrl);
  return t?.videoUrl ? { url: t.videoUrl, language: t.language } : null;
}

function Row({ project: p }: { project: Project }) {
  const poster = projectPosterUrl(p);
  const frame = !poster && p.workflow === "translate" ? p.translations.find((t) => t.videoUrl)?.videoUrl ?? p.sourceVideoUrl : undefined;
  const what = p.workflow === "translate" ? p.targetLanguages.map((l) => languageOf(l).label).join(", ") : p.productName;
  const file = finishedFile(p);
  const action = "focus-ring hidden size-9 shrink-0 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-surface hover:text-ink sm:grid";
  return (
    <li className="group flex items-center gap-1 rounded-[14px] pr-0 sm:pr-2 transition-colors duration-150 hover:bg-surface-muted/70">
      <Link href={`/app/projects/${p.id}`} className="focus-ring flex min-w-0 flex-1 items-center gap-4 rounded-[14px] px-3 py-3">
        <span className="relative block aspect-[9/16] w-10 shrink-0 overflow-hidden rounded-[8px] bg-surface-muted">
          <Poster seed={p.id} monogram={projectMonogram(p)} imageUrl={poster} className="!text-[11px]" />
          {frame && <video src={`${frame}#t=0.5`} muted playsInline preload="metadata" aria-hidden tabIndex={-1} className="pointer-events-none absolute inset-0 size-full object-cover" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink">{p.name}</span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">{what} · {formatDate(p.createdAt)}</span>
        </span>
        <span className="hidden shrink-0 text-[13px] tabular-nums text-muted sm:block">{projectLengthLabel(p)}</span>
        {p.status === "completed" && p.creditsUsed !== undefined && <span className="hidden shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[12px] font-medium tabular-nums text-ink/75 md:inline">{p.creditsUsed} credits</span>}
        <StatusBadge status={p.status} className="shrink-0" />
      </Link>
      {/* Quick actions on a finished video (25 Nov 2026): straight to the editor or the file. */}
      {file ? (
        <>
          <Link href={`/app/projects/${p.id}/edit`} aria-label={`Edit ${p.name}`} title="Edit" className={action}><Scissors className="size-4" aria-hidden /></Link>
          <a href={downloadHref(p.id, file.url, file.language)} download aria-label={`Download ${p.name}`} title="Download" className={action}><Download className="size-4" aria-hidden /></a>
        </>
      ) : (
        <span className="hidden w-[76px] shrink-0 sm:block" aria-hidden />
      )}
    </li>
  );
}
