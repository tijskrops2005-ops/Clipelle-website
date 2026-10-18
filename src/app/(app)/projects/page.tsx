import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProjectsGrid } from "@/components/ProjectsGrid";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <h1 className="text-display text-ink">Projects</h1>
          <p className="text-[17px] text-muted">
            Every video you have started, newest first.
          </p>
        </div>
        <Button href="/new" variant="accent" size="lg" className="shrink-0">
          <Plus className="size-5" aria-hidden />
          Create new video
        </Button>
      </header>

      <ProjectsGrid />
    </div>
  );
}
