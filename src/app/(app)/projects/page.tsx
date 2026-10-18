import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectsGrid } from "@/components/ProjectsGrid";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Projects"
        description="Every video you have started, newest first."
        actions={
          <Button href="/new" variant="accent" size="lg">
            <Plus className="size-5" aria-hidden />
            Create new video
          </Button>
        }
      />
      <ProjectsGrid />
    </div>
  );
}
