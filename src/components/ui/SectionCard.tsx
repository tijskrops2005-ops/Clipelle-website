import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

type SectionCardProps = {
  /** Small mono line above the title, e.g. "Step 1 of 3". */
  eyebrow?: ReactNode;
  /** Ink circle with a number, like the numbered step cards. */
  number?: number;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned element in the header: a badge or a small action. */
  aside?: ReactNode;
  children: ReactNode;
  /** Anchor for "scroll to the first error". */
  id?: string;
  className?: string;
  contentClassName?: string;
};

/**
 * A card with a numbered title row and an explanation, holding one group of related inputs.
 * The forms are built from three of these; the project page uses them for details.
 */
export function SectionCard({ eyebrow, number, title, description, aside, children, id, className, contentClassName }: SectionCardProps) {
  return (
    <Card id={id} className={cn("scroll-mt-24", className)}>
      <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
        <div className="flex items-start gap-4">
          {number !== undefined && (
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-ink text-[15px] font-semibold text-surface" aria-hidden>
              {number}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="label-mono mb-1.5 text-muted">{eyebrow}</p>}
            <h2 className="text-xl font-semibold leading-tight text-ink">{title}</h2>
            {description && <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{description}</p>}
          </div>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      <div className={cn("space-y-6 px-5 pb-5 pt-6 sm:px-7 sm:pb-7", contentClassName)}>{children}</div>
    </Card>
  );
}
