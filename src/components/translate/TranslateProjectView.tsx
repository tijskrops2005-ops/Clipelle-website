"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, Plus, ShieldCheck } from "lucide-react";
import { config } from "@/lib/config";
import type { LanguageCode, Segment, TranslateProject } from "@/lib/types";
import { languageLabel, languageOf } from "@/lib/languages";
import { formatDate } from "@/lib/utils";
import { approveReview, rewriteInAdTone, saveReviewedSegments } from "@/lib/data/client";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { DemoBadge } from "@/components/DemoModeBadge";
import { formatDuration } from "@/components/ui/VideoDropzone";
import { TranslatePipeline } from "./TranslatePipeline";
import { ReviewPanel } from "./ReviewPanel";
import { TRANSLATE_STEPS, translateStepMeta } from "./translateSteps";

/** Project page for the translate workflow: pipeline, review step, one result per language. */
export function TranslateProjectView({ project }: { project: TranslateProject }) {
  const [approving, setApproving] = useState(false);
  const inReview = project.steps.review.status === "needs_input";
  const sourceLanguage: LanguageCode = project.detectedLanguage ?? (project.sourceLanguage === "auto" ? "en" : project.sourceLanguage);

  const [approveError, setApproveError] = useState<string | null>(null);

  function rewrite(language: LanguageCode, segments: Segment[]) {
    // Demo: a prepared shorter variant. Database: Claude via the server (cents, cost guard).
    return rewriteInAdTone(project.id, language, segments);
  }

  async function approve() {
    if (approving) return; // rule 4: no duplicate starts
    setApproving(true);
    setApproveError(null);
    try {
      await approveReview(project.id);
    } catch (error) {
      setApproveError(error instanceof Error ? error.message : "Could not approve. Try again.");
      setApproving(false);
    }
  }

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
        description={`Translation into ${project.targetLanguages.map((l) => languageOf(l).label).join(", ")} · created ${formatDate(project.createdAt)}`}
        actions={
          project.status === "completed" ? (
            <Button href="/new/translate" variant="secondary">
              <Plus className="size-4" aria-hidden />
              Translate another
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-8 xl:grid-cols-3">
        <section className="space-y-5 xl:col-span-2">
          <SectionHeader title="Pipeline" description={summary(project)} />
          <TranslatePipeline project={project} />
        </section>

        <aside className="grid gap-6 md:grid-cols-2 xl:sticky xl:top-6 xl:block xl:self-start xl:space-y-6">
          <StatusCard project={project} />
          <DetailsCard project={project} sourceLanguage={sourceLanguage} />
        </aside>
      </div>

      {inReview && (
        <section className="space-y-5">
          <SectionHeader
            title="Step 3 · Review"
            description="Nothing is rendered until you approve. Edits are saved as you type."
          />
          {approveError && (
            <p role="alert" className="text-sm text-danger">
              {approveError}
            </p>
          )}
          <ReviewPanel
            translations={project.translations}
            sourceLanguage={sourceLanguage}
            onChange={(language, segments) => void saveReviewedSegments(project.id, language, segments).catch(() => {})}
            onRewrite={rewrite}
            onApprove={approve}
            approving={approving}
            demo={config.demoMode}
          />
        </section>
      )}

      {project.status === "completed" && (
        <section className="space-y-5">
          <SectionHeader
            title="Your videos"
            description={`${project.translations.length} ${project.translations.length === 1 ? "video" : "videos"}, 9:16 with captions. Download each one below.`}
            aside={<DemoBadge>Demo placeholders</DemoBadge>}
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {project.translations.map((t) => (
              <Card key={t.language}>
                <CardHeader className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{languageOf(t.language).label}</CardTitle>
                  <StatusBadge status={t.status} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {t.videoUrl && <VideoPlayer src={t.videoUrl} simulated={config.demoMode} />}
                  <p className="text-[13px] leading-relaxed text-muted">
                    Stand-in clip. The real translated video arrives here once the services are connected.
                  </p>
                  {t.videoUrl && (
                    <Button href={t.videoUrl} variant="primary" className="w-full" download>
                      <Download className="size-4" aria-hidden />
                      Download {languageOf(t.language).tag}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function summary(project: TranslateProject) {
  const done = TRANSLATE_STEPS.filter((k) => project.steps[k].status === "completed").length;
  switch (project.status) {
    case "completed":
      return "All four steps finished. Your videos are below.";
    case "review":
      return "Step 3 waits for you: check the translation below and approve it.";
    case "failed": {
      const failed = TRANSLATE_STEPS.find((k) => project.steps[k].status === "failed");
      return failed ? `Step ${translateStepMeta[failed].number} stopped. Read the message in the card and retry when ready.` : "A step stopped.";
    }
    case "processing":
      return `${done} of 4 steps done. You can leave this page; progress continues.`;
    default:
      return "This project has not been started yet.";
  }
}

function StatusCard({ project }: { project: TranslateProject }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per language</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {project.translations.map((t) => (
            <li key={t.language} className="flex items-center justify-between text-sm">
              <span className="text-ink">{languageOf(t.language).label}</span>
              <StatusBadge status={project.status === "review" ? "needs_input" : t.status} />
            </li>
          ))}
        </ul>
        <ul className="space-y-2 border-t border-divider pt-4">
          {TRANSLATE_STEPS.map((k) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="text-ink">
                {translateStepMeta[k].number}. {translateStepMeta[k].title}
              </span>
              <StatusBadge status={project.steps[k].status} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DetailsCard({ project, sourceLanguage }: { project: TranslateProject; sourceLanguage: LanguageCode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {project.sourceVideoUrl && (
          <div>
            <p className="label-mono mb-2 text-muted">Source video</p>
            <div className="relative aspect-video overflow-hidden rounded-[10px] bg-ink shadow-card">
              <video src={project.sourceVideoUrl} controls muted playsInline preload="metadata" className="size-full object-contain" aria-label="Source video" />
            </div>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <dt className="label-mono text-muted">File</dt>
          <dd className="truncate text-ink/90" title={project.sourceFileName}>{project.sourceFileName}</dd>
          <dt className="label-mono text-muted">Length</dt>
          <dd className="text-ink/90">{formatDuration(project.sourceSeconds)}</dd>
          <dt className="label-mono text-muted">Source</dt>
          <dd className="text-ink/90">
            {project.sourceLanguage === "auto" ? `${languageLabel(sourceLanguage)} (detected)` : languageLabel(project.sourceLanguage)}
          </dd>
          <dt className="label-mono text-muted">Quality</dt>
          <dd className="text-ink/90 capitalize">{project.quality}</dd>
        </dl>
        <p className="flex items-start gap-2 rounded-[10px] bg-success/10 p-3 text-[13px] leading-relaxed text-ink/80">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Rights and speaker consent confirmed on {formatDate(project.rightsConfirmedAt)}.
        </p>
      </CardContent>
    </Card>
  );
}
