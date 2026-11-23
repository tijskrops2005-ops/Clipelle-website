"use client";

import { Plus, Scissors } from "lucide-react";
import { useProjects, useProjectsReady } from "@/lib/data/client";
import { useClock } from "@/lib/useClock";
import type { Project } from "@/lib/types";
import { ProjectTile } from "@/components/ProjectTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TileGridSkeleton } from "@/components/ui/Skeleton";

/** A finished project with a file the edit screen can open: an ad's final video, or a translation with at least one finished language. */
export function isEditable(p: Project) {
  if (p.status !== "completed") return false;
  return p.workflow === "ad" ? Boolean(p.finalVideoUrl) : p.translations.some((t) => t.status === "completed" && t.videoUrl);
}

/**
 * The finished videos as tiles that open the edit screen (23 Nov 2026). Same tiles as Projects,
 * newest first; the scissors mark says what a click does. Nothing to edit yet: one empty state that
 * points at making a video.
 */
export function EditPicker() {
  const projects = useProjects();
  const ready = useProjectsReady();
  const now = useClock(15_000);
  const editable = projects.filter(isEditable);
  if (!ready) return <TileGridSkeleton count={8} />;
  if (editable.length === 0) {
    return (
      <EmptyState
        icon={<Scissors className="size-6" aria-hidden />}
        title="Nothing to edit yet"
        description="Finished videos appear here."
        action={<Button href="/new" variant="primary"><Plus className="size-4" aria-hidden />Create new video</Button>}
      />
    );
  }
  return (
    <section aria-label="Finished videos">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {editable.map((project) => (
          <li key={project.id}>
            <ProjectTile project={project} now={now} href={`/projects/${project.id}/edit`} action="edit" />
          </li>
        ))}
      </ul>
    </section>
  );
}
