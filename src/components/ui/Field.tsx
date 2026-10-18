import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

/** Wraps a form control with a label, optional hint and an error line. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {optional && <span className="label-mono text-muted/80">Optional</span>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Shared control styling for Input and Textarea. */
export const controlClass =
  "w-full rounded-control border bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/60 " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-ink/15 disabled:opacity-60";

export function controlStateClass(invalid?: boolean) {
  return invalid
    ? "border-danger focus:border-danger focus:ring-danger/20"
    : "border-border focus:border-ink/30";
}
