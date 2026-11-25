import type { Metadata } from "next";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { getScope } from "@/lib/auth";
import { config } from "@/lib/config";
import { listProjects } from "@/lib/data/server";
import { ProjectsProvider } from "@/lib/data/ProjectsProvider";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await connection();
  // The list rendered on the server (25 Nov 2026, speed): the grid shows at once, the store refreshes behind it.
  const scope = await getScope();
  const initial = scope && !config.demoMode ? await listProjects(scope).catch(() => undefined) : undefined;
  return (
    <ProjectsProvider initial={initial}>
      <div className="space-y-10">
        <PageHeader title="Projects" actions={<Button href="/app/new" variant="primary"><Plus className="size-4" aria-hidden />New video</Button>} />
        <ProjectsGrid />
      </div>
    </ProjectsProvider>
  );
}
