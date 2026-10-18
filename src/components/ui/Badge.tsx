import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import type { ProjectStatus, StepStatus } from "@/lib/types";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

/* Text stays ink on every tint so small badge text keeps AA contrast; the tint + dot carry the colour. */
const tinted: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink",
  accent: "bg-accent/12 text-ink",
  success: "bg-success/12 text-ink",
  warning: "bg-warning/12 text-ink",
  danger: "bg-danger/12 text-ink",
};

const dot: Record<Tone, string> = {
  neutral: "bg-muted",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

type BadgeProps = ComponentProps<"span"> & {
  tone?: Tone;
  /** "tinted" sits inside cards; "floating" is white with a shadow, for use over images. */
  variant?: "tinted" | "floating";
};

export function Badge({
  tone = "neutral",
  variant = "tinted",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        variant === "tinted" ? tinted[tone] : "bg-surface text-ink shadow-card",
        className,
      )}
      {...props}
    />
  );
}

/** Maps a project/step status to a tone and a human label. */
export const statusMeta: Record<
  ProjectStatus | StepStatus,
  { tone: Tone; label: string }
> = {
  draft: { tone: "neutral", label: "Draft" },
  waiting: { tone: "warning", label: "Waiting" },
  processing: { tone: "accent", label: "Processing" },
  completed: { tone: "success", label: "Completed" },
  failed: { tone: "danger", label: "Failed" },
};

export function StatusBadge({
  status,
  variant = "tinted",
  className,
}: {
  status: ProjectStatus | StepStatus;
  variant?: "tinted" | "floating";
  className?: string;
}) {
  const { tone, label } = statusMeta[status];
  return (
    <Badge tone={tone} variant={variant} className={className}>
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", dot[tone], status === "processing" && "animate-pulse")}
      />
      {label}
    </Badge>
  );
}
