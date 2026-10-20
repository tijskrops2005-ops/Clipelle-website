"use client";

import type { TranslateProject } from "@/lib/types";
import { retryStep } from "@/lib/data/client";
import { StepProgressCard } from "@/components/pipeline/PipelineStep";
import { Poster } from "@/components/Poster";
import { TRANSLATE_STEPS, translateStepMeta } from "./translateSteps";

/** Three steps in sequence: upload → translate (with the automatic check) → captions. */
export function TranslatePipeline({ project }: { project: TranslateProject }) {
  return (
    <div className="grid gap-5 md:grid-cols-3 md:gap-6">
      {TRANSLATE_STEPS.map((key) => (
        <StepProgressCard
          key={key}
          meta={translateStepMeta[key]}
          step={project.steps[key]}
          poster={key === "captions" || key === "translate" ? <Poster seed={`${project.id}:${key}`} /> : undefined}
          onRetry={() => retryStep(project.id, key)}
        />
      ))}
    </div>
  );
}
