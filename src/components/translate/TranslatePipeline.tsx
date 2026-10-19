"use client";

import type { TranslateProject } from "@/lib/types";
import { retryTranslateStep } from "@/lib/mock/runner";
import { StepProgressCard } from "@/components/pipeline/PipelineStep";
import { Poster } from "@/components/Poster";
import { TRANSLATE_STEPS, translateStepMeta } from "./translateSteps";

/** Four steps in sequence: upload → translate → review (user) → captions. */
export function TranslatePipeline({ project }: { project: TranslateProject }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      {TRANSLATE_STEPS.map((key) => (
        <StepProgressCard
          key={key}
          meta={translateStepMeta[key]}
          step={project.steps[key]}
          poster={key === "captions" || key === "translate" ? <Poster seed={`${project.id}:${key}`} /> : undefined}
          onRetry={() => retryTranslateStep(project.id, key)}
        />
      ))}
    </div>
  );
}
