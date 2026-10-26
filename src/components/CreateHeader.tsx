import type { ReactNode } from "react";
import { PipelineStrip } from "@/components/site/Sketches";

/**
 * The top of every page where a video is made (26 Oct 2026, in the homepage's style): a mono
 * label, a big tight title, one sentence, and the same dashed step strip as the homepage, so the
 * customer sees what runs after the button. Replaces the grey step boxes.
 */
export function CreateHeader({ eyebrow, title, text, steps }: { eyebrow: string; title: ReactNode; text: ReactNode; steps?: string[] }) {
  return (
    <header>
      <p className="label-mono text-muted">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl text-[clamp(2.1rem,4.2vw,3.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">{title}</h1>
      <p className="mt-4 max-w-2xl text-subtitle text-muted">{text}</p>
      {steps && <PipelineStrip labels={steps} className="mt-8" />}
    </header>
  );
}
