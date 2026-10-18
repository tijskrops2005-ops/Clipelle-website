"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowLeft, Download, FolderOpen, Plus } from "lucide-react";
import { config } from "@/lib/config";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useProjects } from "@/lib/mock/store";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { Pipeline } from "@/components/pipeline/Pipeline";
import { stepMeta } from "@/components/pipeline/PipelineStep";

export function ProjectView({ id }: { id: string }) {
  const projects = useProjects();
  const project = projects.find((p) => p.id === id);

  // The demo store hydrates from localStorage after mount; avoid a "not found" flash
  // by rendering a skeleton until we are on the client.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!project) {
    if (!ready) return <ProjectSkeleton />;
    return (
      <EmptyState
        icon={<FolderOpen className="size-6" aria-hidden />}
        title="Project not found"
        description="It may have been removed, or the link is incomplete."
        action={
          <Button href="/dashboard" variant="secondary">
            <ArrowLeft className="size-4" aria-hidden />
            Back to dashboard
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboard
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-display text-ink">{project.name}</h1>
              <StatusBadge status={project.status} className="translate-y-1" />
            </div>
            <p className="text-[17px] text-muted">
              {project.productName} · created {formatDate(project.createdAt)}
            </p>
          </div>
          <HeaderActions project={project} />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-5 lg:col-span-2">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Pipeline</h2>
            <p className="mt-1.5 text-[15px] text-muted">{pipelineSummary(project)}</p>
          </div>
          <Pipeline project={project} />
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <ResultCard project={project} />
          <DetailsCard project={project} />
        </aside>
      </div>
    </div>
  );
}

function pipelineSummary(project: Project) {
  const done = (["vmake", "heygen", "veed"] as const).filter(
    (k) => project.steps[k].status === "completed",
  ).length;
  switch (project.status) {
    case "completed":
      return "All three steps finished. Your video is ready on the right.";
    case "failed": {
      const failed = (["vmake", "heygen", "veed"] as const).find(
        (k) => project.steps[k].status === "failed",
      );
      return failed
        ? `Step ${stepMeta[failed].number} stopped. Read the message in the card and retry when ready.`
        : "A step stopped.";
    }
    case "processing":
      return `${done} of 3 steps done. You can leave this page; progress continues.`;
    default:
      return "This project has not been started yet.";
  }
}

function HeaderActions({ project }: { project: Project }) {
  if (project.status !== "completed" || !project.finalVideoUrl) return null;
  return (
    <div className="flex items-center gap-3">
      <Button href="/new" variant="secondary">
        <Plus className="size-4" aria-hidden />
        Make another
      </Button>
      <Button href={project.finalVideoUrl} variant="accent" download>
        <Download className="size-4" aria-hidden />
        Download
      </Button>
    </div>
  );
}

function ResultCard({ project }: { project: Project }) {
  if (project.status === "completed" && project.finalVideoUrl) {
    return (
      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <CardTitle>Your video</CardTitle>
          <Badge tone="warning">Demo placeholder</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <VideoPlayer
            src={project.finalVideoUrl}
            poster={project.imageUrls[0]}
            simulated={config.demoMode}
          />
          <p className="text-[13px] leading-relaxed text-muted">
            This clip is a stand-in. The real ad arrives here once VEED is connected.
          </p>
          <div className="grid gap-3">
            <Button href={project.finalVideoUrl} variant="accent" size="lg" download>
              <Download className="size-[18px]" aria-hidden />
              Download video
            </Button>
            <Button href="/new" variant="primary">
              <Plus className="size-4" aria-hidden />
              Make another
            </Button>
            <Button href="/dashboard" variant="ghost">
              <ArrowLeft className="size-4" aria-hidden />
              Back to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const failed = project.status === "failed";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{failed ? "Paused" : "Your video"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-[9/16] overflow-hidden rounded-tile bg-surface-muted">
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <p className="text-sm text-muted">
              {failed
                ? "The video will continue once the failed step is retried."
                : "Your finished video appears here when step 3 is done."}
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {(["vmake", "heygen", "veed"] as const).map((k) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="text-ink">
                {stepMeta[k].number}. {stepMeta[k].title}
              </span>
              <StatusBadge status={project.steps[k].status} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DetailsCard({ project }: { project: Project }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {project.imageUrls.length > 0 && (
          <div>
            <p className="label-mono mb-2 text-muted">Product images</p>
            <div className="flex gap-2">
              {project.imageUrls.slice(0, 5).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- demo-only data URL
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="size-12 rounded-[8px] object-cover shadow-card"
                />
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="label-mono mb-1.5 text-muted">Description</p>
          <p className="leading-relaxed text-ink/90">{project.description}</p>
        </div>
        {project.productUrl && (
          <div>
            <p className="label-mono mb-1.5 text-muted">Product URL</p>
            <a
              href={project.productUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-ink underline decoration-border underline-offset-4 hover:decoration-ink"
            >
              {project.productUrl}
            </a>
          </div>
        )}
        <div>
          <p className="label-mono mb-1.5 text-muted">Script</p>
          <p className="leading-relaxed text-ink/90">
            {project.script ?? <span className="text-muted">No script given. A short one is written from the description.</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectSkeleton() {
  return (
    <div className="animate-pulse space-y-10" aria-busy>
      <div className="space-y-4">
        <div className="h-4 w-24 rounded bg-surface-muted" />
        <div className="h-10 w-2/3 rounded bg-surface-muted" />
        <div className="h-5 w-1/3 rounded bg-surface-muted" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 rounded-card bg-surface-muted" />
            <div className="h-64 rounded-card bg-surface-muted" />
          </div>
          <div className="h-64 rounded-card bg-surface-muted" />
        </div>
        <div className="h-[520px] rounded-card bg-surface-muted" />
      </div>
    </div>
  );
}
