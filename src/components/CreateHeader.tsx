import type { ReactNode } from "react";
import { PipelineStrip } from "@/components/site/Sketches";

/**
 * The top of every page where a video is made: the page title (the size of `PageHeader`), at most
 * one line, and the four-step strip so the customer sees what runs after the button. No eyebrow and
 * no intro paragraph since 23 Nov 2026 (docs/design-clarity.md); `eyebrow` stays in the props so
 * call sites compile and is ignored.
 */
export function CreateHeader({ title, text, steps }: { eyebrow?: string; title: ReactNode; text?: ReactNode; steps?: string[] }) {
  return (
    <header>
      <h1 className="text-display max-w-3xl text-ink">{title}</h1>
      {text && <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">{text}</p>}
      {steps && <PipelineStrip labels={steps} className="mt-6" />}
    </header>
  );
}
