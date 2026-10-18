import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import type { ProjectStatus, StepStatus } from "@/lib/types";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/5 text-muted",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
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
  className,
}: {
  status: ProjectStatus | StepStatus;
  className?: string;
}) {
  const { tone, label } = statusMeta[status];
  return (
    <Badge tone={tone} className={className}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full bg-current",
          status === "processing" && "animate-pulse",
        )}
      />
      {label}
    </Badge>
  );
}
