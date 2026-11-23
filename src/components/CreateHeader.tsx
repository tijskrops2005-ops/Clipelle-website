import type { ReactNode } from "react";
import { PipelineStrip } from "@/components/site/Sketches";

/**
 * The top of every page where a video is made (26 Oct 2026, in the homepage's style): a mono
 * label, the page title, one sentence, and the same dashed step strip as the homepage, so the
 * customer sees what runs after the button. Since 23 Nov 2026 the title and description are the
 * sizes of `PageHeader` (one header system for the app), and the strip carries a small "After you
 * start" label: its 1-4 are the run, not the form's blocks 1-2-3 below it.
 */
export function CreateHeader({ eyebrow, title, text, steps }: { eyebrow: string; title: ReactNode; text: ReactNode; steps?: string[] }) {
  return (
    <header>
      <p className="label-mono text-muted">{eyebrow}</p>
      <h1 className="text-display mt-3 max-w-3xl text-ink">{title}</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">{text}</p>
      {steps && (
        <div className="mt-8">
          <p className="label-mono mb-2 text-muted">After you start</p>
          <PipelineStrip labels={steps} />
        </div>
      )}
    </header>
  );
}
