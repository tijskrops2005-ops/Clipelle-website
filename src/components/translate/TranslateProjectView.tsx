"use client";

import Link from "next/link";
import { ArrowLeft, Download, Plus, ShieldCheck, SpellCheck } from "lucide-react";
import { config } from "@/lib/config";
import type { LanguageCode, TranslateProject } from "@/lib/types";
import { languageLabel, languageOf } from "@/lib/languages";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { DemoBadge } from "@/components/DemoModeBadge";
import { formatDuration } from "@/components/ui/VideoDropzone";
import { formatUsd } from "@/lib/pricing";
import { TranslatePipeline } from "./TranslatePipeline";
import { TRANSLATE_STEPS, translateStepMeta } from "./translateSteps";

/** Project page for the translate workflow: pipeline, automatic quality check, one result per language. */
export function TranslateProjectView({ project }: { project: TranslateProject }) {
  const sourceLanguage: LanguageCode = project.detectedLanguage ?? (project.sourceLanguage === "auto" ? "en" : project.sourceLanguage);

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

      {project.translations.some((t) => t.qa) && (
        <section className="space-y-5">
          <SectionHeader title="Quality check" description="Every line was compared with the original and corrected where needed. Nothing waits for you." aside={<DemoBadge>Demo check</DemoBadge>} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {project.translations.filter((t) => t.qa).map((t) => (
              <Card key={t.language}>
                <CardHeader className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{languageOf(t.language).label}</CardTitle>
                  <span className="flex items-center gap-1.5 text-[13px] text-muted"><SpellCheck className="size-4 text-success" aria-hidden />{t.qa!.changes.length} {t.qa!.changes.length === 1 ? "line" : "lines"} corrected</span>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {t.qa!.summary && <p className="text-ink/90">{t.qa!.summary}</p>}
                  {t.qa!.changes.slice(0, 6).map((c) => (
                    <div key={c.index} className="rounded-[10px] bg-surface-muted p-3 text-[13px]">
                      <p className="text-muted line-through">{c.before}</p>
                      <p className="text-ink">{c.after}</p>
                      <p className="mt-1 text-muted">{c.reason}</p>
                    </div>
                  ))}
                  {t.qa!.warnings.length > 0 && (
                    <ul className="space-y-1 rounded-[10px] bg-warning/10 p-3 text-[13px] text-ink">
                      {t.qa!.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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
                  {t.error && (
                    <p role="alert" className="rounded-[10px] bg-danger/10 p-3 text-[13px] leading-relaxed text-ink">
                      {t.error}
                    </p>
                  )}
                  {config.demoMode && (
                    <p className="text-[13px] leading-relaxed text-muted">
                      Stand-in clip. The real translated video arrives here once the services are connected.
                    </p>
                  )}
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
      return "All three steps finished. Your videos are below.";
    case "review":
      return "Waiting.";
    case "failed": {
      const failed = TRANSLATE_STEPS.find((k) => project.steps[k].status === "failed");
      return failed ? `Step ${translateStepMeta[failed].number} stopped. Read the message in the card and retry when ready.` : "A step stopped.";
    }
    case "processing":
      return `${done} of 3 steps done. You can leave this page; progress continues.`;
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
            <li key={t.language} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">
                {languageOf(t.language).label}
                {t.spentUsd !== undefined && !config.demoMode && <span className="label-mono ml-2 text-muted">{formatUsd(t.spentUsd)}</span>}
              </span>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
        {(project.budgetUsd !== undefined || project.estimateUsd !== undefined) && (
          <p className="flex items-center justify-between rounded-[10px] bg-surface-muted px-3 py-2 text-[13px]">
            <span className="text-muted">{config.demoMode ? "Estimated cost per language" : "Budget per language"}</span>
            <span className="font-medium text-ink">
              {config.demoMode ? formatUsd(project.estimateUsd ?? 0) : formatUsd(project.budgetUsd ?? 0)}
              {!config.demoMode && project.spentUsd !== undefined ? <span className="text-muted"> · spent in total {formatUsd(project.spentUsd)}</span> : null}
            </span>
          </p>
        )}
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
            <VideoPlayer src={project.sourceVideoUrl} fit="contain" muted aspect="16:9" className="rounded-[10px]" />
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
