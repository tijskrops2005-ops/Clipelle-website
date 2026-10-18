import Link from "next/link";
import { Play } from "lucide-react";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

/** Vertical 9:16 video tile with a status badge — the unit of the dashboard and projects grid. */
export function ProjectTile({ project }: { project: Project }) {
  const isCompleted = project.status === "completed";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-card border border-border bg-surface">
        {/* Placeholder thumbnail — real poster frames arrive with VEED output (Stage 7). */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg to-border/60" />
        <div className="absolute inset-0 grid place-items-center">
          {isCompleted ? (
            <span className="grid size-12 place-items-center rounded-full bg-ink/90 text-surface transition-transform group-hover:scale-105">
              <Play className="ml-0.5 size-5" fill="currentColor" aria-hidden />
            </span>
          ) : (
            <span className="text-4xl font-semibold tracking-tight text-muted/50">
              {project.productName.charAt(0)}
            </span>
          )}
        </div>
        <StatusBadge
          status={project.status}
          className="absolute left-3 top-3 bg-surface/90 backdrop-blur"
        />
      </div>

      <div className="mt-3 space-y-0.5">
        <h3 className="truncate text-sm font-medium text-ink group-hover:underline">
          {project.name}
        </h3>
        <p className="truncate text-xs text-muted">
          {project.productName} · {formatDate(project.createdAt)}
        </p>
      </div>
    </Link>
  );
}
