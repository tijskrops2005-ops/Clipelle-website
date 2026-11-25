import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { EditPicker } from "@/components/edit/EditPicker";
import { getScope } from "@/lib/auth";
import { config } from "@/lib/config";
import { listProjects } from "@/lib/data/server";
import { ProjectsProvider } from "@/lib/data/ProjectsProvider";

export const metadata: Metadata = { title: "Edit a video" };

/** Pick a finished video to open on the edit screen (23 Nov 2026, Tijs: reachable from the menu, not only from the video itself). */
export default async function EditPage() {
  await connection();
  const scope = await getScope();
  const initial = scope && !config.demoMode ? await listProjects(scope).catch(() => undefined) : undefined;
  return (
    <ProjectsProvider initial={initial}>
      <div className="space-y-10">
        <PageHeader title="Edit a video" description="Trim, cut, captions, text and logo. The result is saved as a new version." />
        <EditPicker />
      </div>
    </ProjectsProvider>
  );
}
