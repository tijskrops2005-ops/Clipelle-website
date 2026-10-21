"use client";

import { ArrowRight, Plus, Video } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { TileGridSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/PageHeader";
import { ProjectTile } from "@/components/ProjectTile";

const LIMIT = 4;

/** Client component: reads the reactive mock store so new demo projects appear immediately. */
export function RecentProjects() {
  const all = useProjects();
  const ready = useProjectsReady();
  const projects = all.filter((p) => !p.archivedAt).slice(0, LIMIT);

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Recent projects"
        description={
          !ready ? "Loading…" : all.length === 0 ? "Nothing here yet." : `Showing ${projects.length} of ${all.length}`
        }
        aside={
          all.length > 0 && (
            <Button href="/projects" variant="ghost" size="sm">
              View all
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )
        }
      />

      {!ready ? (
        <TileGridSkeleton />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Video className="size-6" aria-hidden />}
          title="No videos yet"
          description="Create your first video and follow its progress here."
          action={
            <Button href="/new" variant="accent" size="lg">
              <Plus className="size-[18px]" aria-hidden />
              Create new video
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectTile key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
