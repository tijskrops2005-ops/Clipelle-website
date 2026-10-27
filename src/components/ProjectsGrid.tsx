"use client";

import { useMemo, useState } from "react";
import { Archive, CheckSquare, Download, Loader2, Plus, Search, Video, X } from "lucide-react";
import type { Project, ProjectStatus, WorkflowKind } from "@/lib/types";
import { downloadZip, useProjects, useProjectsReady } from "@/lib/data/client";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectTile } from "@/components/ProjectTile";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

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

/** Search over name, tags and the product or languages; words must all appear. */
export function matchesSearch(project: Project, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [project.name, ...(project.tags ?? []), project.workflow === "ad" ? project.productName : project.targetLanguages.join(" ")].join(" ").toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}

export function ProjectsGrid() {
  const projects = useProjects();
  const ready = useProjectsReady();
  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  // One pass per filter change, not one per tile: the list stays quick with hundreds of projects.
  const scoped = useMemo(() => projects.filter((p) => (showArchived ? Boolean(p.archivedAt) : !p.archivedAt) && matchesSearch(p, query)), [projects, showArchived, query]);
  const archivedCount = useMemo(() => projects.filter((p) => p.archivedAt).length, [projects]);
  const byKind = useMemo(() => scoped.filter((p) => matchesKind(p, kind)), [scoped, kind]);
  const visible = useMemo(() => byKind.filter((p) => matches(p, filter)), [byKind, filter]);
  const statusCounts = useMemo(() => Object.fromEntries(filters.map(({ key }) => [key, byKind.filter((p) => matches(p, key)).length])) as Record<Filter, number>, [byKind]);
  const kindCounts = useMemo(() => Object.fromEntries(kindFilters.map(({ key }) => [key, scoped.filter((p) => matchesKind(p, key)).length])) as Record<KindFilter, number>, [scoped]);
  const nothingAtAll = projects.length === 0;
  const selectableIds = useMemo(() => new Set(visible.filter((p) => p.status === "completed").map((p) => p.id)), [visible]);
  const chosen = [...selected].filter((id) => selectableIds.has(id));

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else if (next.size < 25) next.add(id);
      return next;
    });
  }
  async function zip() {
    setZipping(true);
    setZipError(null);
    try {
      await downloadZip(chosen);
    } catch (e) {
      setZipError(e instanceof Error ? e.message : "Could not build the ZIP.");
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Search, archive switch and selection for a ZIP download */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, tag, product or language" aria-label="Search projects" className="pl-9" />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={showArchived ? "primary" : "secondary"} size="sm" onClick={() => setShowArchived((v) => !v)} aria-pressed={showArchived}>
            <Archive className="size-4" aria-hidden />
            {showArchived ? "Showing archived" : `Archived${archivedCount ? ` (${archivedCount})` : ""}`}
          </Button>
          <Button type="button" variant={selecting ? "primary" : "secondary"} size="sm" onClick={() => { setSelecting((v) => !v); setSelected(new Set()); }} aria-pressed={selecting}>
            {selecting ? <X className="size-4" aria-hidden /> : <CheckSquare className="size-4" aria-hidden />}
            {selecting ? "Done selecting" : "Select"}
          </Button>
          {selecting && (
            <Button type="button" variant="accent" size="sm" onClick={zip} disabled={chosen.length === 0 || zipping}>
              {zipping ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
              Download ZIP{chosen.length ? ` (${chosen.length})` : ""}
            </Button>
          )}
        </div>
      </div>
      {selecting && <p className={cn("text-[13px]", zipError ? "text-danger" : "text-muted")}>{zipError ?? "Tap finished videos to select them (up to 25, 1 GB together). The ZIP holds the finished MP4s; unfinished projects cannot be selected."}</p>}

      {/* Two filters, stacked with a label each, so the row never looks like one long control */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
          <span id="filter-status-label" className="label-mono w-16 shrink-0 text-muted">Status</span>
          <SegmentedControl label="Filter by status" options={filters.map((f) => ({ ...f, count: statusCounts[f.key] }))} value={filter} onChange={setFilter} />
        </div>
        {/* The type row only matters while there are ads to tell apart (27 Oct 2026: ads are coming soon). */}
        {kindCounts.ad > 0 && (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
            <span id="filter-kind-label" className="label-mono w-16 shrink-0 text-muted">Type</span>
            <SegmentedControl label="Filter by type" options={kindFilters.map((f) => ({ ...f, count: kindCounts[f.key] }))} value={kind} onChange={setKind} size="sm" />
          </div>
        )}
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
          title={nothingAtAll ? emptyCopy.all.title : query.trim() ? "Nothing matches your search" : showArchived ? "No archived projects" : kind !== "all" && filter === "all" ? (kind === "ad" ? "No ads yet" : "No translations yet") : emptyCopy[filter].title}
          description={
            nothingAtAll
              ? emptyCopy.all.description
              : query.trim()
                ? "Try another word, or clear the search. Tags are searched too."
                : showArchived
                  ? "Archive a project from its page to keep it out of the way without losing it."
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
                  setQuery("");
                  setShowArchived(false);
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
            <ProjectTile key={project.id} project={project} selectable={selecting && selectableIds.has(project.id)} selected={selected.has(project.id)} onToggle={() => toggle(project.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
