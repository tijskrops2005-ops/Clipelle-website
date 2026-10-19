"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock, RotateCcw, TriangleAlert, UserRoundCheck } from "lucide-react";
import { config } from "@/lib/config";
import type { AdProject, Step, StepKey } from "@/lib/types";
import { retryStep } from "@/lib/data/client";
import { Button } from "@/components/ui/Button";
import { Poster } from "@/components/Poster";
import { StepCard } from "@/components/StepCard";

export type StepMeta = {
  number: number;
  title: string;
  service: string;
  description: string;
  waitingNote: string;
  /** Shown while the step waits for the user (status "needs_input"). */
  needsInputNote?: string;
  /** Label on the completed panel, e.g. "Clip ready". */
  doneLabel?: string;
};

export const stepMeta: Record<StepKey, StepMeta> = {
  script: {
    number: 1,
    title: "Script",
    service: config.stepLabels.script,
    description: "A hook, the presenter's lines, three benefits and a call to action, written from your product description.",
    waitingNote: "Queued. Starts as soon as the workflow begins.",
    doneLabel: "Script ready",
  },
  productClip: {
    number: 2,
    title: "Product clip",
    service: config.stepLabels.productClip,
    description: "Turns your product photos into a short clip that shows the product in motion.",
    waitingNote: "Starts when the script is ready.",
  },
  presenter: {
    number: 3,
    title: "AI presenter",
    service: config.stepLabels.presenter,
    description: "A realistic presenter speaks your script on camera, with natural voice and lip-sync.",
    waitingNote: "Starts when the script is ready, at the same time as the product clip.",
  },
  finalEdit: {
    number: 4,
    title: "Final edit",
    service: config.stepLabels.finalEdit,
    description: "Combines both clips into a 9:16 ad with captions, music and a call to action.",
    waitingNote: "Waits until the product clip and the presenter are both ready.",
  },
};

export function formatSeconds(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Ticks once a second while a step is processing, so the elapsed time stays current. */
function useElapsed(step: Step) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (step.status !== "processing" || !step.startedAt) return;
    const started = Date.parse(step.startedAt);
    const update = () => setElapsed(Date.now() - started);
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [step.status, step.startedAt]);
  return elapsed;
}

/**
 * Generic live step card: renders the right inner panel for a step's status.
 * Used by both workflows; the workflow-specific wrappers supply meta, poster and retry.
 */
export function StepProgressCard({
  meta,
  step,
  poster,
  onRetry,
  className,
}: {
  meta: StepMeta;
  step: Step;
  /** Thumbnail shown on the completed panel. */
  poster?: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  const elapsed = useElapsed(step);

  let panel: ReactNode;
  let footer: ReactNode;

  switch (step.status) {
    case "waiting":
      panel = (
        <div className="flex items-center gap-3 text-sm text-muted">
          <Clock className="size-4 shrink-0" aria-hidden />
          <span>{meta.waitingNote}</span>
        </div>
      );
      break;

    case "needs_input":
      panel = (
        <div className="flex items-center gap-3 text-sm text-ink">
          <UserRoundCheck className="size-4 shrink-0 text-warning" aria-hidden />
          <span>{meta.needsInputNote ?? "This step waits for you."}</span>
        </div>
      );
      break;

    case "processing":
      panel = (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden />
              Generating…
            </span>
            <span className="label-mono text-muted">{formatSeconds(elapsed)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full w-1/3 animate-[slide_1.6s_ease-in-out_infinite] rounded-full bg-accent" />
          </div>
          <p className="text-[13px] text-muted">
            Demo mode: this takes seconds here. The real service usually needs a few minutes.
          </p>
        </div>
      );
      break;

    case "completed": {
      const took =
        step.startedAt && step.finishedAt
          ? Date.parse(step.finishedAt) - Date.parse(step.startedAt)
          : undefined;
      panel = (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {poster && (
              <div className="relative aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-[8px] shadow-card">{poster}</div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{meta.doneLabel ?? "Clip ready"}</p>
              <p className="text-[13px] text-muted">
                {took !== undefined ? `Done in ${formatSeconds(took)}` : "Done"}
                {step.attempt && step.attempt > 1 ? ` · attempt ${step.attempt}` : ""}
              </p>
            </div>
          </div>
          {step.warning && (
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink/80">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>{step.warning}</span>
            </p>
          )}
        </div>
      );
      break;
    }

    case "failed":
      panel = (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-danger">This step did not finish</p>
          <p className="text-sm leading-relaxed text-ink/80">{step.error ?? "An unknown error occurred."}</p>
        </div>
      );
      footer = onRetry ? (
        <Button size="sm" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden />
          Retry this step
        </Button>
      ) : undefined;
      break;
  }

  return (
    <StepCard
      number={meta.number}
      title={meta.title}
      service={meta.service}
      description={meta.description}
      status={step.status}
      panel={panel}
      footer={footer}
      className={className}
    />
  );
}

/** One live step card of the ad workflow. */
export function PipelineStep({
  project,
  stepKey,
  className,
}: {
  project: AdProject;
  stepKey: StepKey;
  className?: string;
}) {
  return (
    <StepProgressCard
      meta={stepMeta[stepKey]}
      step={project.steps[stepKey]}
      poster={stepKey === "script" ? undefined : <Poster seed={`${project.id}:${stepKey}`} imageUrl={stepKey === "productClip" ? project.imageUrls[0] : undefined} />}
      onRetry={() => retryStep(project.id, stepKey)}
      className={className}
    />
  );
}
