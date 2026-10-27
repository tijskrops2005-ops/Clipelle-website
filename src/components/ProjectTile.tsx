import Link from "next/link";
import { Check, Clapperboard, Languages, Play } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { projectLengthLabel, projectMonogram, projectPosterUrl, projectSubtitle, projectVideoCount } from "@/lib/projectMeta";
import { StatusBadge } from "@/components/ui/Badge";
import { Poster } from "@/components/Poster";
import { translateProgress } from "@/lib/translateProgress";

/** Vertical 9:16 video tile — the eye-catcher of the dashboard and the projects grid. */
export function ProjectTile({ project, selectable, selected, onToggle }: { project: Project; selectable?: boolean; selected?: boolean; onToggle?: () => void }) {
  const isCompleted = project.status === "completed";
  const posterUrl = projectPosterUrl(project);
  // A translation being made shows its one progress on the tile too (27 Oct 2026).
  const progress = project.workflow === "translate" && project.status === "processing" ? translateProgress(project) : null;
  const format = project.workflow === "translate" && project.format === "original" ? "original size" : "9:16";
  // A translation has no product photo: its first frame is the poster (26 Oct 2026), the result or else the source.
  const frameVideo = !posterUrl && project.workflow === "translate" ? project.translations.find((t) => t.videoUrl)?.videoUrl ?? project.sourceVideoUrl : undefined;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="focus-ring group relative block rounded-tile"
      onClick={selectable ? (e) => { e.preventDefault(); onToggle?.(); } : undefined}
      aria-pressed={selectable ? Boolean(selected) : undefined}
    >
      {selectable && (
        <span className={cn("absolute right-3 top-3 z-10 grid size-7 place-items-center rounded-full border-2 shadow-card", selected ? "border-accent bg-accent text-white" : "border-surface bg-surface/90 text-transparent")} aria-hidden>
          <Check className="size-4" />
        </span>
      )}
      <div className={cn("relative aspect-[9/16] overflow-hidden rounded-tile bg-surface-muted shadow-card transition-[box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-card-hover", selected && "ring-2 ring-accent ring-offset-2 ring-offset-bg")}>
        {/* Poster: the first product image, or a curated gradient.
            Real poster frames arrive with the final-edit output (Stage 8). */}
        <Poster
          seed={project.id}
          monogram={projectMonogram(project)}
          imageUrl={posterUrl}
        />
        {frameVideo && (
          <video src={`${frameVideo}#t=0.5`} muted playsInline preload="metadata" aria-hidden tabIndex={-1} className="pointer-events-none absolute inset-0 size-full object-cover" />
        )}

        {/* a soft sheen that slides over the poster on hover */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.18)_50%,transparent_60%)] transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
        <StatusBadge
          status={project.status}
          variant="floating"
          className="absolute left-3 top-3"
        />
        {project.workflow === "translate" && !selectable && (
          <span
            className="label-mono absolute right-3 top-3 inline-flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-ink shadow-card"
            title={`Translation into ${project.targetLanguages.length} ${project.targetLanguages.length === 1 ? "language" : "languages"}`}
          >
            <Languages className="size-3" aria-hidden />
            {project.targetLanguages.length}
          </span>
        )}

        {progress && (
          <div className="absolute inset-x-3 bottom-3 rounded-[10px] bg-surface/92 p-2.5 shadow-card backdrop-blur-[2px]">
            <div className="flex items-center justify-between text-[12px] font-medium text-ink">
              <span className="truncate pr-2">{progress.current}</span>
              <span className="shrink-0 tabular-nums">{progress.percent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
              <div className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-700" style={{ transform: `scaleX(${progress.percent / 100})` }} />
            </div>
          </div>
        )}

        {isCompleted && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/60 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-surface">
              <div className="min-w-0">
                <p className="label-mono opacity-90">
                  {projectVideoCount(project) > 1 ? `${projectVideoCount(project)} videos · ${format}` : `${projectLengthLabel(project)} · ${format}`}
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card transition-transform group-hover:scale-105">
                <Play className="ml-0.5 size-4" fill="currentColor" aria-hidden />
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-3.5 space-y-0.5 px-0.5">
        <h3
          className={cn(
            "truncate text-[15px] font-semibold text-ink",
            "group-hover:underline decoration-border underline-offset-4",
          )}
        >
          {project.name}
        </h3>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          {/* Kind label: which workflow made this project */}
          <span className="label-mono inline-flex shrink-0 items-center gap-1 rounded-full bg-ink/5 px-1.5 py-0.5 text-ink">
            {project.workflow === "translate" ? <Languages className="size-3" aria-hidden /> : <Clapperboard className="size-3" aria-hidden />}
            {project.workflow === "translate" ? "Translation" : "Ad"}
          </span>
          <span className="truncate">
            {project.archivedAt ? "Archived · " : ""}{projectSubtitle(project)} · {formatDate(project.createdAt)}
          </span>
        </p>
      </div>
    </Link>
  );
}
