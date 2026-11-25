"use client";

import { Plus, Video } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { TileGridSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/PageHeader";
import { ProjectTile } from "@/components/ProjectTile";
import { useClock } from "@/lib/useClock";

const LIMIT = 4;

/** Client component: reads the reactive mock store so new demo projects appear immediately. */
export function RecentProjects() {
  const all = useProjects();
  const ready = useProjectsReady();
  const now = useClock(15_000);
  const current = all.filter((p) => !p.archivedAt);
  const projects = current.slice(0, LIMIT);

  return (
    <section className="space-y-6">
      <SectionHeader title="Recent projects" aside={all.length > 0 && <Button href="/app/projects" variant="ghost" size="sm">View all</Button>} />

      {!ready ? (
        <TileGridSkeleton />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Video className="size-6" aria-hidden />}
          title="No videos yet"
          action={
            <Button href="/app/new" variant="accent" size="lg">
              <Plus className="size-[18px]" aria-hidden />
              Create new video
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectTile key={project.id} project={project} now={now} />
          ))}
        </div>
      )}
    </section>
  );
}
