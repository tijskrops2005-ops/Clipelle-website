import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Small element above the title, e.g. a back link. */
  eyebrow?: ReactNode;
  /** Badge next to the title. */
  badge?: ReactNode;
  /** Buttons, aligned right on wide screens. */
  actions?: ReactNode;
  className?: string;
};

/** One header for every page: display title, 17px description, optional actions. */
export function PageHeader({ title, description, eyebrow, badge, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-5", className)}>
      {eyebrow}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display text-ink">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-[17px] leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned element: a link, badge or button. */
  aside?: ReactNode;
};

/** 24px section title with a muted line under it; used by every page section. */
export function SectionHeader({ title, description, aside }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1.5 text-[15px] text-muted">{description}</p>}
      </div>
      {aside}
    </div>
  );
}
