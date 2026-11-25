import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectView } from "@/components/ProjectView";
import { getScope } from "@/lib/auth";
import { config } from "@/lib/config";
import { getProject } from "@/lib/data/server";
import { ProjectsProvider } from "@/lib/data/ProjectsProvider";

export const metadata: Metadata = { title: "Project" };

type Params = Promise<{ id: string }>;

/** Reads the dynamic param behind Suspense so the shell stays static (Cache Components). */
async function ProjectRoute({ params }: { params: Params }) {
  const { id } = await params;
  // This one project rendered on the server (25 Nov 2026, speed); the store keeps it fresh afterwards.
  const scope = await getScope();
  const project = scope && !config.demoMode ? await getProject(id, scope).catch(() => null) : null;
  return (
    <ProjectsProvider initial={project ? [project] : undefined}>
      <ProjectView id={id} />
    </ProjectsProvider>
  );
}

export default function ProjectPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <ProjectRoute params={params} />
    </Suspense>
  );
}
