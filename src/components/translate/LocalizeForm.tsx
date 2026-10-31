"use client";

import { ArrowLeft, FolderOpen } from "lucide-react";
import { useProject, useProjectsReady } from "@/lib/data/client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { TranslateForm } from "@/components/translate/TranslateForm";

/**
 * The translate form with a stored video as the source, nothing uploaded again: "Localize this ad"
 * (a finished ad; the rights are recorded as generated here) or "Add a language" (an earlier
 * translation's own upload, 31 Oct 2026; the rights box is asked again). Same createTranslateProject route.
 */
export function LocalizeForm({ fromId }: { fromId: string }) {
  const project = useProject(fromId);
  const ready = useProjectsReady();
  if (!project) {
    if (!ready) {
      return (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      );
    }
    return <EmptyState icon={<FolderOpen className="size-6" aria-hidden />} title="Video not found" description="The video to translate could not be found. Upload a video instead." action={<Button href="/new/translate" variant="secondary"><ArrowLeft className="size-4" aria-hidden />Translate a video</Button>} />;
  }
  if (project.workflow === "translate") {
    if (!project.sourceVideoUrl) {
      return <EmptyState icon={<FolderOpen className="size-6" aria-hidden />} title="This video is not stored yet" description="Add a language once the upload has finished. You can follow its progress on the project page." action={<Button href={`/projects/${project.id}`} variant="secondary"><ArrowLeft className="size-4" aria-hidden />Open the project</Button>} />;
    }
    return <TranslateForm fromTranslation={project} />;
  }
  if (project.status !== "completed" || !project.finalVideoUrl) {
    return <EmptyState icon={<FolderOpen className="size-6" aria-hidden />} title="This ad is not finished yet" description="Translate it once the video is ready. You can follow its progress on the project page." action={<Button href={`/projects/${project.id}`} variant="secondary"><ArrowLeft className="size-4" aria-hidden />Open the ad</Button>} />;
  }
  return <TranslateForm fromAd={project} />;
}
