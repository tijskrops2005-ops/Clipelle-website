import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectsGrid } from "@/components/ProjectsGrid";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="space-y-10">
      <PageHeader title="Projects" actions={<Button href="/new" variant="primary"><Plus className="size-4" aria-hidden />New video</Button>} />
      <ProjectsGrid />
    </div>
  );
}
