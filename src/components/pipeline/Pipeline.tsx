"use client";

import type { Project } from "@/lib/types";
import { PipelineStep } from "@/components/pipeline/PipelineStep";

/** Product clip and presenter side by side (they run in parallel), final edit below (it needs both). */
export function Pipeline({ project }: { project: Project }) {
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <PipelineStep project={project} stepKey="productClip" />
        <PipelineStep project={project} stepKey="presenter" />
      </div>

      {/* connector */}
      <div className="flex flex-col items-center py-2" aria-hidden>
        <span className="h-6 w-px bg-divider" />
        <span className="label-mono my-2 text-muted">Both clips go to step 3</span>
        <span className="h-6 w-px bg-divider" />
      </div>

      <PipelineStep project={project} stepKey="finalEdit" />
    </div>
  );
}
