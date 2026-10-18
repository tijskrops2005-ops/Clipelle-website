import Link from "next/link";
import { Play } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

/** Vertical 9:16 video tile — the eye-catcher of the dashboard and the projects grid. */
export function ProjectTile({ project }: { project: Project }) {
  const isCompleted = project.status === "completed";
  const poster = project.imageUrls[0];

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-tile bg-surface-muted shadow-card transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-card-hover">
        {/* Poster: the first product image if there is one, otherwise a soft placeholder.
            Real poster frames arrive with VEED output (Stage 7). */}
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- demo-only data URL / blob preview
          <img
            src={poster}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-surface-muted via-surface-muted to-border" />
            <span
              aria-hidden
              className="absolute bottom-4 right-5 select-none text-[56px] font-semibold leading-none tracking-tight text-ink/10"
            >
              {project.productName.charAt(0)}
            </span>
          </>
        )}

        <StatusBadge
          status={project.status}
          variant="floating"
          className="absolute left-3 top-3"
        />

        {isCompleted && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/60 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-surface">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <p className="label-mono mt-1 opacity-80">0:24 · 9:16</p>
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
        <p className="truncate text-[13px] text-muted">
          {project.productName} · {formatDate(project.createdAt)}
        </p>
      </div>
    </Link>
  );
}
