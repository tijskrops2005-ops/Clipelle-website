"use client";

import Link from "next/link";
import { ArrowLeft, Download, FolderOpen, Plus } from "lucide-react";
import { config } from "@/lib/config";
import type { AdProject } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useProject, useProjectsReady } from "@/lib/data/client";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { DemoBadge } from "@/components/DemoModeBadge";
import { formatUsd } from "@/lib/pricing";
import { languageLabel } from "@/lib/languages";
import { DEFAULT_TONE, TONE_META } from "@/lib/adOptions";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { Pipeline } from "@/components/pipeline/Pipeline";
import { stepMeta } from "@/components/pipeline/PipelineStep";
import { TranslateProjectView } from "@/components/translate/TranslateProjectView";

export function ProjectView({ id }: { id: string }) {
  const project = useProject(id);
  // Demo: the store hydrates from localStorage after mount; database: the first fetch takes a moment.
  // Either way, show a skeleton instead of a "not found" flash.
  const ready = useProjectsReady();

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

  if (project.workflow === "translate") return <TranslateProjectView project={project} />;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-control text-sm font-medium text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Dashboard
          </Link>
        }
        title={project.name}
        badge={<StatusBadge status={project.status} className="translate-y-1" />}
        description={`${project.productName} · created ${formatDate(project.createdAt)}`}
        actions={<HeaderActions project={project} />}
      />

      <div className="grid gap-8 xl:grid-cols-3">
        <section className="space-y-5 xl:col-span-2">
          <SectionHeader title="Pipeline" description={pipelineSummary(project)} />
          <Pipeline project={project} />
        </section>

        <aside className="grid gap-6 md:grid-cols-2 xl:sticky xl:top-6 xl:block xl:self-start xl:space-y-6">
          <ResultCard project={project} />
          <DetailsCard project={project} />
        </aside>
      </div>
    </div>
  );
}

function pipelineSummary(project: AdProject) {
  const done = (["script", "productClip", "presenter", "finalEdit"] as const).filter(
    (k) => project.steps[k].status === "completed",
  ).length;
  switch (project.status) {
    case "completed":
      return "All four steps finished. Your video is ready on the right.";
    case "failed": {
      const failed = (["script", "productClip", "presenter", "finalEdit"] as const).find(
        (k) => project.steps[k].status === "failed",
      );
      return failed
        ? `Step ${stepMeta[failed].number} stopped. Read the message in the card and retry when ready.`
        : "A step stopped.";
    }
    case "processing":
      return `${done} of 4 steps done. You can leave this page; progress continues.`;
    default:
      return "This project has not been started yet.";
  }
}

function HeaderActions({ project }: { project: AdProject }) {
  if (project.status !== "completed" || !project.finalVideoUrl) return null;
  return (
    <div className="flex items-center gap-3">
      <Button href="/new/ad" variant="secondary">
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

function SpentLine({ project }: { project: AdProject }) {
  if (project.spentUsd === undefined && project.estimateUsd === undefined) return null;
  const spent = project.spentUsd ?? 0;
  const budget = project.budgetUsd;
  return (
    <p className="flex items-center justify-between rounded-[10px] bg-surface-muted px-3 py-2 text-[13px]">
      <span className="text-muted">{config.demoMode ? "Estimated cost" : "Spent so far"}</span>
      <span className="font-medium text-ink">
        {config.demoMode ? formatUsd(project.estimateUsd ?? 0) : formatUsd(spent)}
        {budget !== undefined ? <span className="text-muted"> of {formatUsd(budget)}</span> : null}
      </span>
    </p>
  );
}

function ResultCard({ project }: { project: AdProject }) {
  if (project.status === "completed" && project.finalVideoUrl) {
    return (
      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <CardTitle>Your video</CardTitle>
          <DemoBadge>Demo placeholder</DemoBadge>
        </CardHeader>
        <CardContent className="space-y-5">
          <VideoPlayer
            src={project.finalVideoUrl}
            poster={project.imageUrls[0]}
            simulated={config.demoMode}
            className="mx-auto w-full max-w-xs"
          />
          {config.demoMode && (
            <p className="text-[13px] leading-relaxed text-muted">
              This clip is a stand-in. The real ad arrives here once the final edit is connected.
            </p>
          )}
          <SpentLine project={project} />
          <div className="grid gap-3">
            <Button href={project.finalVideoUrl} variant="accent" size="lg" download>
              <Download className="size-[18px]" aria-hidden />
              Download video
            </Button>
            <Button href="/new/ad" variant="primary">
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
        <div className="relative mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-tile bg-surface-muted">
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <p className="text-sm text-muted">
              {failed
                ? "The video will continue once the failed step is retried."
                : "Your finished video appears here when step 4 is done."}
            </p>
          </div>
        </div>
        <SpentLine project={project} />
        <ul className="space-y-2">
          {(["script", "productClip", "presenter", "finalEdit"] as const).map((k) => (
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

function DetailsCard({ project }: { project: AdProject }) {
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
                  alt={`Product image ${i + 1} of ${project.productName}`}
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
              className="break-all rounded-control text-ink underline decoration-border underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              {project.productUrl}
            </a>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label-mono mb-1.5 text-muted">Language</p>
            <p className="text-ink/90">{languageLabel(project.language ?? "en")}</p>
          </div>
          <div>
            <p className="label-mono mb-1.5 text-muted">Tone</p>
            <p className="text-ink/90">{TONE_META[project.tone ?? DEFAULT_TONE].label}</p>
          </div>
          <div>
            <p className="label-mono mb-1.5 text-muted">Offer</p>
            <p className="text-ink/90">{project.offer || <span className="text-muted">None</span>}</p>
          </div>
          <div>
            <p className="label-mono mb-1.5 text-muted">Length · presenter</p>
            <p className="text-ink/90">{project.seconds ?? 30} s · {project.engine === "avatar_iii" ? "Standard" : "Premium"}</p>
          </div>
        </div>
        {project.direction && (
          <div>
            <p className="label-mono mb-1.5 text-muted">Direction</p>
            <p className="leading-relaxed text-ink/90">{project.direction}</p>
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

export function ProjectSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true">
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <PageHeaderSkeleton />
      </div>
      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
          </div>
          <Skeleton className="h-64 rounded-card" />
        </div>
        <Skeleton className="h-[520px] rounded-card" />
      </div>
    </div>
  );
}
