"use client";

import { useEffect, useState } from "react";
import { Clock, RotateCcw } from "lucide-react";
import type { Project, Step, StepKey } from "@/lib/types";
import { retryStep } from "@/lib/mock/runner";
import { Button } from "@/components/ui/Button";
import { Poster } from "@/components/Poster";
import { StepCard } from "@/components/StepCard";

type Meta = { number: number; title: string; service: string; description: string; waitingNote: string };

export const stepMeta: Record<StepKey, Meta> = {
  vmake: {
    number: 1,
    title: "Product video",
    service: "Vmake",
    description: "Turns your product photos into a short clip that shows the product in motion.",
    waitingNote: "Queued. Starts as soon as the workflow begins.",
  },
  heygen: {
    number: 2,
    title: "AI presenter",
    service: "HeyGen",
    description: "A realistic presenter speaks your script on camera, with natural voice and lip-sync.",
    waitingNote: "Queued. Runs at the same time as the product video.",
  },
  veed: {
    number: 3,
    title: "Final video",
    service: "VEED",
    description: "Combines both clips into a 9:16 ad with captions, music and a call to action.",
    waitingNote: "Waits until the product video and the presenter are both ready.",
  },
};

function formatSeconds(ms: number) {
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

export function PipelineStep({
  project,
  stepKey,
  className,
}: {
  project: Project;
  stepKey: StepKey;
  className?: string;
}) {
  const meta = stepMeta[stepKey];
  const step = project.steps[stepKey];
  const elapsed = useElapsed(step);

  let panel: React.ReactNode;
  let footer: React.ReactNode;

  switch (step.status) {
    case "waiting":
      panel = (
        <div className="flex items-center gap-3 text-sm text-muted">
          <Clock className="size-4 shrink-0" aria-hidden />
          <span>{meta.waitingNote}</span>
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
        <div className="flex items-center gap-4">
          <div className="relative aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-[8px] shadow-card">
            <Poster seed={`${project.id}:${stepKey}`} imageUrl={stepKey === "vmake" ? project.imageUrls[0] : undefined} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Clip ready</p>
            <p className="text-[13px] text-muted">
              {took !== undefined ? `Done in ${formatSeconds(took)}` : "Done"}
              {step.attempt && step.attempt > 1 ? ` · attempt ${step.attempt}` : ""}
            </p>
          </div>
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
      footer = (
        <Button size="sm" onClick={() => retryStep(project.id, stepKey)}>
          <RotateCcw className="size-4" aria-hidden />
          Retry this step
        </Button>
      );
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
