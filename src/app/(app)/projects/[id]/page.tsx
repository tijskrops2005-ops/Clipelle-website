import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectView } from "@/components/ProjectView";

export const metadata: Metadata = { title: "Project" };

type Params = Promise<{ id: string }>;

/** Reads the dynamic param behind Suspense so the shell stays static (Cache Components). */
async function ProjectRoute({ params }: { params: Params }) {
  const { id } = await params;
  return <ProjectView id={id} />;
}

export default function ProjectPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <ProjectRoute params={params} />
    </Suspense>
  );
}
