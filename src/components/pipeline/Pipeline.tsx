"use client";

import type { AdProject } from "@/lib/types";
import { PipelineStep } from "@/components/pipeline/PipelineStep";

/** Script first, then product clip and presenter side by side (parallel), then the final edit (needs both). */
export function Pipeline({ project }: { project: AdProject }) {
  return (
    <div>
      <PipelineStep project={project} stepKey="script" />

      <div className="flex justify-center py-1" aria-hidden><span className="h-6 w-px bg-divider" /></div>

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <PipelineStep project={project} stepKey="productClip" />
        <PipelineStep project={project} stepKey="presenter" />
      </div>

      <div className="flex justify-center py-1" aria-hidden><span className="h-6 w-px bg-divider" /></div>

      <PipelineStep project={project} stepKey="finalEdit" />
    </div>
  );
}
