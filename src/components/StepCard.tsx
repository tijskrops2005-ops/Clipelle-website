import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/Badge";

type StepCardProps = {
  number: number;
  title: string;
  /** Service name, rendered as a mono micro-label: "Vmake", "HeyGen", "VEED". */
  service: string;
  description: string;
  /** Shown as a muted inner panel: an illustration (dashboard) or live status details (project page). */
  panel?: ReactNode;
  /** When provided the card reflects pipeline state; omitted on the dashboard explainer. */
  status?: StepStatus;
  /** Actions under the description, e.g. a Retry button. */
  footer?: ReactNode;
  className?: string;
};

/**
 * Numbered step card — the recognisable element of the app.
 * Used as an explainer on the dashboard and as the live pipeline on the project page.
 */
export function StepCard({
  number,
  title,
  service,
  description,
  panel,
  status,
  footer,
  className,
}: StepCardProps) {
  const active = status === "processing";

  return (
    <article
      className={cn(
        "flex flex-col rounded-card bg-surface p-5 shadow-card transition-shadow sm:p-7",
        active && "ring-1 ring-accent/40",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <StepNumber number={number} status={status} />
          <div>
            <h3 className="text-lg font-semibold leading-tight text-ink">
              {title}
            </h3>
            <p className="label-mono mt-1.5 text-muted">{service}</p>
          </div>
        </div>
        {status && <StatusBadge status={status} />}
      </header>

      {panel && (
        <div className="mt-6 rounded-[14px] bg-surface-muted p-5">{panel}</div>
      )}

      <p className="mt-5 text-sm leading-relaxed text-muted">{description}</p>
      {footer && <div className="mt-5">{footer}</div>}
    </article>
  );
}

function StepNumber({
  number,
  status,
}: {
  number: number;
  status?: StepStatus;
}) {
  const base =
    "grid size-9 shrink-0 place-items-center rounded-full text-[15px] font-semibold";

  if (status === "completed") {
    return (
      <span className={cn(base, "bg-success text-white")} aria-label="Completed">
        <Check className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={cn(base, "bg-danger text-white")} aria-label="Failed">
        <X className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        status === "processing" ? "bg-accent text-white" : "bg-ink text-surface",
      )}
    >
      {number}
    </span>
  );
}
