"use client";

import { useState } from "react";
import { Plus, Video } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/types";
import { useProjects } from "@/lib/mock/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectTile } from "@/components/ProjectTile";

type Filter = "all" | Extract<ProjectStatus, "processing" | "completed" | "failed">;

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

const emptyCopy: Record<Filter, { title: string; description: string }> = {
  all: {
    title: "No videos yet",
    description: "Create your first video and it shows up here.",
  },
  processing: {
    title: "Nothing is processing",
    description: "Start a new video and follow its three steps here.",
  },
  completed: {
    title: "No finished videos yet",
    description: "Completed videos land here, ready to download.",
  },
  failed: {
    title: "No failed videos",
    description: "Good news. If a step ever stops, you can retry it from the project page.",
  },
};

function matches(project: Project, filter: Filter) {
  return filter === "all" || project.status === filter;
}

export function ProjectsGrid() {
  const projects = useProjects();
  const [filter, setFilter] = useState<Filter>("all");
  const visible = projects.filter((p) => matches(p, filter));

  return (
    <div className="space-y-8">
      {/* Filter: a segmented control with counts */}
      <div
        role="tablist"
        aria-label="Filter by status"
        className="inline-flex flex-wrap gap-1 rounded-full bg-surface-muted p-1"
      >
        {filters.map(({ key, label }) => {
          const count = projects.filter((p) => matches(p, key)).length;
          const active = key === filter;
          return (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all",
                active
                  ? "bg-surface text-ink shadow-card"
                  : "text-muted hover:text-ink",
              )}
            >
              {label}
              <span
                className={cn(
                  "label-mono rounded-full px-1.5 py-0.5",
                  active ? "bg-ink/5 text-ink" : "text-muted/80",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Video className="size-6" aria-hidden />}
          title={emptyCopy[filter].title}
          description={emptyCopy[filter].description}
          action={
            filter === "all" || filter === "processing" ? (
              <Button href="/new" variant="accent" size="lg">
                <Plus className="size-[18px]" aria-hidden />
                Create new video
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setFilter("all")}>
                Show all projects
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-7 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((project) => (
            <ProjectTile key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
