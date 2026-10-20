"use client";

import { useMemo, useState } from "react";
import { Plus, Video } from "lucide-react";
import type { Project, ProjectStatus, WorkflowKind } from "@/lib/types";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { Skeleton } from "@/components/ui/Skeleton";
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
    description: "Start a new video and follow its steps here.",
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

type KindFilter = "all" | WorkflowKind;

const kindFilters: { key: KindFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ad", label: "Ads" },
  { key: "translate", label: "Translations" },
];

/** A project paused for review still counts as "processing" in the filter: it is not finished. */
function matches(project: Project, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "processing") return project.status === "processing" || project.status === "review";
  return project.status === filter;
}

function matchesKind(project: Project, kind: KindFilter) {
  return kind === "all" || project.workflow === kind;
}

export function ProjectsGrid() {
  const projects = useProjects();
  const ready = useProjectsReady();
  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  // One pass per filter change, not one per tile: the list stays quick with hundreds of projects.
  const byKind = useMemo(() => projects.filter((p) => matchesKind(p, kind)), [projects, kind]);
  const visible = useMemo(() => byKind.filter((p) => matches(p, filter)), [byKind, filter]);
  const statusCounts = useMemo(() => Object.fromEntries(filters.map(({ key }) => [key, byKind.filter((p) => matches(p, key)).length])) as Record<Filter, number>, [byKind]);
  const kindCounts = useMemo(() => Object.fromEntries(kindFilters.map(({ key }) => [key, projects.filter((p) => matchesKind(p, key)).length])) as Record<KindFilter, number>, [projects]);
  const nothingAtAll = projects.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl label="Filter by status" options={filters} value={filter} counts={statusCounts} onChange={setFilter} />
        <SegmentedControl label="Filter by kind" options={kindFilters} value={kind} counts={kindCounts} onChange={setKind} />
      </div>

      {!ready ? (
        <div className="grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-tile" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Video className="size-6" aria-hidden />}
          title={nothingAtAll ? emptyCopy.all.title : kind !== "all" && filter === "all" ? (kind === "ad" ? "No ads yet" : "No translations yet") : emptyCopy[filter].title}
          description={
            nothingAtAll
              ? emptyCopy.all.description
              : kind !== "all"
                ? `Nothing matches this combination. ${kind === "ad" ? "Ads" : "Translations"} you start show up here.`
                : emptyCopy[filter].description
          }
          action={
            nothingAtAll || (filter === "processing" && kind === "all") ? (
              <Button href="/new" variant="accent" size="lg">
                <Plus className="size-[18px]" aria-hidden />
                Create new video
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setFilter("all");
                  setKind("all");
                }}
              >
                Show all projects
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((project) => (
            <ProjectTile key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A pill row with counts; one for status, one for kind. */
function SegmentedControl<K extends string>({
  label,
  options,
  value,
  counts,
  onChange,
}: {
  label: string;
  options: { key: K; label: string }[];
  value: K;
  counts: Record<K, number>;
  onChange: (key: K) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full bg-surface-muted p-1">
      {options.map(({ key, label: text }) => {
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted",
              active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {text}
            <span className={cn("label-mono rounded-full px-1.5 py-0.5", active ? "bg-ink/5 text-ink" : "text-muted")}>{counts[key]}</span>
          </button>
        );
      })}
    </div>
  );
}
