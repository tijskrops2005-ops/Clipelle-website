import type { Metadata } from "next";
import { ArrowRight, Plus, Video } from "lucide-react";
import { getRecentProjects } from "@/lib/mock";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectTile } from "@/components/ProjectTile";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const projects = await getRecentProjects(4);

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="max-w-xl text-muted">
            Enter your product once and we run Vmake, HeyGen and VEED for you.
            Your finished video shows up here.
          </p>
        </div>
        <Button href="/new" variant="accent" size="lg">
          <Plus className="size-5" aria-hidden />
          Create new video
        </Button>
      </header>

      {/* Recent projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Recent projects</h2>
          <Button href="/projects" variant="ghost" size="sm">
            View all
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<Video className="size-8" aria-hidden />}
            title="No videos yet"
            description="Create your first video and follow its progress here."
            action={
              <Button href="/new" variant="accent">
                <Plus className="size-4" aria-hidden />
                Create new video
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {projects.map((project) => (
              <ProjectTile key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
