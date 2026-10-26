"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Download, FolderOpen, Languages, LayoutGrid, Plus } from "lucide-react";
import { Collapsible } from "@/components/ui/Collapsible";
import { projectDurationMs } from "@/lib/projectMeta";
import { formatTook } from "@/components/pipeline/PipelineStep";
import { adProjectCredits, chargedCredits } from "@/lib/projectCredits";
import { config } from "@/lib/config";
import type { AdProject } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { downloadHref, useProject, useProjects, useProjectsReady } from "@/lib/data/client";
import { useStatusTitle } from "@/lib/useStatusTitle";
import { otherVersionsOf, translationsOf } from "@/lib/versions";
import { languageOf } from "@/lib/languages";
import { formatByKey } from "@/content/formats";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { DemoBadge } from "@/components/DemoModeBadge";
import { AD_LANGUAGES, isAdLanguage, SPEEDS } from "@/lib/voiceOptions";
import { DEFAULT_TONE, TONE_META } from "@/lib/adOptions";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { Pipeline } from "@/components/pipeline/Pipeline";
import { stepMeta } from "@/components/pipeline/PipelineStep";
import { TranslateProjectView } from "@/components/translate/TranslateProjectView";
import { ScriptReviewPanel } from "@/components/ScriptReviewPanel";
import { ProjectActions } from "@/components/ProjectActions";

export function ProjectView({ id }: { id: string }) {
  const project = useProject(id);
  // Demo: the store hydrates from localStorage after mount; database: the first fetch takes a moment.
  // Either way, show a skeleton instead of a "not found" flash.
  const ready = useProjectsReady();
  useStatusTitle(project ? { status: project.status, name: project.name } : null);

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
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/dashboard"
              className="focus-ring inline-flex items-center gap-1.5 rounded-control text-sm font-medium text-muted transition-colors duration-150 hover:text-ink"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Dashboard
            </Link>
            {project.batchId && (
              <Link href={`/batches/${project.batchId}`} className="focus-ring inline-flex items-center gap-1.5 rounded-control text-sm font-medium text-muted transition-colors duration-150 hover:text-ink">
                <LayoutGrid className="size-4" aria-hidden />
                Part of a batch of variations
              </Link>
            )}
          </span>
        }
        title={project.name}
        badge={<StatusBadge status={project.status} className="translate-y-1" />}
        description={`${project.productName} · created ${formatDate(project.createdAt)}${project.archivedAt ? " · archived" : ""}${project.tags?.length ? ` · ${project.tags.join(", ")}` : ""}`}
      />
      <ProjectActions project={project} />

      {project.status === "completed" && project.finalVideoUrl ? (
        <>
          {/* The result first: the player and the facts about the video, then the rest folded away. */}
          <ResultHero project={project} />
          <RelatedProjects project={project} />
          <Collapsible title="Pipeline" summary={pipelineSummary(project)}>
            <Pipeline project={project} />
          </Collapsible>
          <Collapsible title="Project details" summary="Your input: product, presenter, brand style and script.">
            <DetailsCard project={project} />
          </Collapsible>
        </>
      ) : (
        <div className="grid gap-8 xl:grid-cols-3">
          <section className="space-y-5 xl:col-span-2">
            {project.steps.script.status === "needs_input" && <ScriptReviewPanel project={project} />}
            <SectionHeader title="Pipeline" description={pipelineSummary(project)} />
            <Pipeline project={project} />
          </section>

          <aside className="grid gap-6 md:grid-cols-2 xl:sticky xl:top-6 xl:block xl:self-start xl:space-y-6">
            <ResultCard project={project} />
            <DetailsCard project={project} />
            <RelatedProjects project={project} compact />
          </aside>
        </div>
      )}
    </div>
  );
}

/** Facts about a finished video, next to the player: length, format, language, quality and what it cost. */
function ResultHero({ project }: { project: AdProject }) {
  const took = projectDurationMs(project);
  const language = isAdLanguage(project.language) ? AD_LANGUAGES[project.language].label : "English";
  const quality = project.engine === "avatar_iv" ? "Premium" : "Standard";
  return (
    <section className="space-y-5">
      <SectionHeader title="Your video" description="Ready to download. 9:16, captions included." aside={<DemoBadge>Demo placeholder</DemoBadge>} />
      <Card>
        <CardContent className="grid gap-8 pt-7 md:grid-cols-[auto_1fr] md:items-center">
          {/* The player keeps its position in the tree, so polls never remount it. */}
          <VideoPlayer
            src={project.finalVideoUrl!}
            poster={project.imageUrls[0]}
            simulated={config.demoMode}
            className="mx-auto w-full max-w-[280px] md:mx-0"
          />
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <Fact label="Length" value={`${project.seconds ?? 30} s`} />
              <Fact label="Format" value="9:16 · 1080p" />
              <Fact label="Language" value={`${language}${project.accent ? ` · ${project.accent.toUpperCase()}` : ""}`} />
              <Fact label="Presenter quality" value={quality} />
              <Fact label="Tone" value={TONE_META[project.tone ?? DEFAULT_TONE].label} />
              <Fact label="Ready in" value={took !== undefined ? formatTook(took) : "—"} />
            </dl>
            <div className="panel p-4">
              <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted">Credits used</span>
                <span className="font-medium text-ink">
                  {config.demoMode ? adProjectCredits(project) : chargedCredits(project)} credits
                  {config.demoMode && <span className="text-muted"> · demo, nothing was charged</span>}
                </span>
              </p>
              {config.demoMode && (
                <p className="mt-2 text-[13px] leading-relaxed text-muted">This clip is a stand-in. The real ad arrives here once the services are connected.</p>
              )}
            </div>
            {/* One row (26 Oct 2026): the download is the one accent button, the next steps sit beside it. */}
            <div className="space-y-3">
              <Button href={downloadHref(project.id, project.finalVideoUrl!)} prefetch={false} variant="accent" size="lg" download className="w-full sm:w-auto">
                <Download className="size-[18px]" aria-hidden />
                Download video
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button href={`/new/translate?from=${project.id}`} variant="secondary">
                  <Languages className="size-4" aria-hidden />
                  Translate this ad
                </Button>
                <Button href={`/new/ad?from=${project.id}`} variant="secondary">
                  <Copy className="size-4" aria-hidden />
                  Make another version
                </Button>
                <Button href={`/new/ad?from=${project.id}&variations=1`} variant="secondary">
                  <LayoutGrid className="size-4" aria-hidden />
                  Make variations
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-mono mb-1 text-muted">{label}</dt>
      <dd className="text-ink/90">{value}</dd>
    </div>
  );
}

function pipelineSummary(project: AdProject) {
  const done = (["script", "productClip", "presenter", "finalEdit"] as const).filter(
    (k) => project.steps[k].status === "completed",
  ).length;
  switch (project.status) {
    case "completed":
      return "All four steps finished. Your video is above.";
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

/**
 * The group this ad belongs to: its other versions ("Make another version") and the translations
 * made from it ("Localize this ad"). Hidden when there is nothing to show.
 */
function RelatedProjects({ project, compact }: { project: AdProject; compact?: boolean }) {
  const all = useProjects();
  const versions = otherVersionsOf(all, project);
  const translations = translationsOf(all, project.id);
  if (versions.length === 0 && translations.length === 0) return null;
  const body = (
    <CardContent className={cn("grid gap-6", !compact && "md:grid-cols-2")}>
      {versions.length > 0 && (
        <div>
          <p className="label-mono mb-2 text-muted">Other versions</p>
          <ul className="space-y-1.5">
            {versions.map((v) => (
              <li key={v.id}>
                <Link href={`/projects/${v.id}`} className="focus-ring flex items-center justify-between gap-3 rounded-control px-2 py-1.5 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted">
                  <span className="truncate">{v.name}</span>
                  <StatusBadge status={v.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {translations.length > 0 && (
        <div>
          <p className="label-mono mb-2 text-muted">Translations of this ad</p>
          <ul className="space-y-1.5">
            {translations.map((t) => (
              <li key={t.id}>
                <Link href={`/projects/${t.id}`} className="focus-ring flex items-center justify-between gap-3 rounded-control px-2 py-1.5 text-sm text-ink transition-colors duration-150 hover:bg-surface-muted">
                  <span className="truncate">{t.targetLanguages.map((l) => languageOf(l).tag).join(", ")} · {t.name}</span>
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardContent>
  );
  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Related</CardTitle>
        </CardHeader>
        {body}
      </Card>
    );
  }
  return (
    <section className="space-y-5">
      <SectionHeader title="Versions and translations" description={`This ad is version ${project.version ?? 1}. Other versions and translations made from it are listed here.`} />
      <Card>{body}</Card>
    </section>
  );
}

function SpentLine({ project }: { project: AdProject }) {
  return (
    <p className="flex items-center justify-between rounded-[10px] bg-surface-muted px-3 py-2 text-[13px]">
      <span className="text-muted">{config.demoMode ? "Credits" : project.status === "failed" ? "Credits" : "Credits reserved"}</span>
      <span className="font-medium text-ink">
        {config.demoMode ? adProjectCredits(project) : chargedCredits(project)}
        {project.status === "failed" && !config.demoMode ? <span className="text-muted"> · refunded</span> : null}
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
            <Button href={downloadHref(project.id, project.finalVideoUrl)} prefetch={false} variant="accent" size="lg" download>
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
            <p className="text-ink/90">
              {isAdLanguage(project.language) ? AD_LANGUAGES[project.language].label : "English"}
              {project.accent ? ` · ${project.accent.toUpperCase()}` : ""}
              {project.speed && project.speed !== "normal" ? ` · ${SPEEDS.find((s) => s.key === project.speed)?.label.toLowerCase()} voice` : ""}
            </p>
          </div>
          <div>
            <p className="label-mono mb-1.5 text-muted">Tone{project.format ? " · format" : ""}</p>
            <p className="text-ink/90">{TONE_META[project.tone ?? DEFAULT_TONE].label}{project.format ? ` · ${formatByKey(project.format)?.name ?? project.format}` : ""}</p>
          </div>
          <div>
            <p className="label-mono mb-1.5 text-muted">Offer</p>
            <p className="text-ink/90">{project.offer || <span className="text-muted">None</span>}</p>
          </div>
          <div>
            <p className="label-mono mb-1.5 text-muted">Length · presenter</p>
            <p className="text-ink/90">{project.seconds ?? 30} s · {project.engine === "avatar_iv" ? "Premium" : "Standard"}</p>
          </div>
        </div>
        {project.background && (
          <div>
            <p className="label-mono mb-1.5 text-muted">Presenter background</p>
            {project.background.type === "color" ? (
              <p className="flex items-center gap-2 text-ink/90"><span className="size-4 rounded-full border border-border" style={{ backgroundColor: project.background.value }} aria-hidden />{project.background.value}</p>
            ) : project.background.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded background preview
              <img src={project.background.url} alt="Presenter background" className="h-16 w-12 rounded-[8px] object-cover shadow-card" />
            ) : (
              <p className="text-ink/90">Your own image</p>
            )}
          </div>
        )}
        {project.brand && (project.brand.accent || project.brand.captionStyle || project.brand.font || project.brand.logoUrl) && (
          <div>
            <p className="label-mono mb-1.5 text-muted">Brand style</p>
            <p className="flex flex-wrap items-center gap-2 text-ink/90">
              {project.brand.accent && <span className="flex items-center gap-1.5"><span className="size-4 rounded-full border border-border" style={{ backgroundColor: project.brand.accent }} aria-hidden />{project.brand.accent}</span>}
              {project.brand.captionStyle && <span>· captions {project.brand.captionStyle}</span>}
              {project.brand.font && <span>· {project.brand.font}</span>}
              {project.brand.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded logo preview
                <img src={project.brand.logoUrl} alt="Logo" className="h-8 w-8 rounded-[6px] object-contain bg-surface-muted" />
              )}
            </p>
          </div>
        )}
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
