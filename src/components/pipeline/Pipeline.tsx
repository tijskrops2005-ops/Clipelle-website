"use client";

import type { Project } from "@/lib/types";
import { PipelineStep } from "@/components/pipeline/PipelineStep";

/** Vmake and HeyGen side by side (they run in parallel), VEED below (it needs both). */
export function Pipeline({ project }: { project: Project }) {
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2">
        <PipelineStep project={project} stepKey="vmake" />
        <PipelineStep project={project} stepKey="heygen" />
      </div>

      {/* connector */}
      <div className="flex flex-col items-center py-2" aria-hidden>
        <span className="h-6 w-px bg-divider" />
        <span className="label-mono my-2 text-muted">Both clips go to step 3</span>
        <span className="h-6 w-px bg-divider" />
      </div>

      <PipelineStep project={project} stepKey="veed" />
    </div>
  );
}
