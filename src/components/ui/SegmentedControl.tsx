"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Option<K extends string> = { key: K; label: ReactNode; count?: number; disabled?: boolean };

/**
 * A pill row for a small set of mutually exclusive choices (filters, speed, caption position).
 * role="radiogroup" with arrow-key movement; "tabs" look is the same, only the roles differ.
 */
export function SegmentedControl<K extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  size = "md",
  className,
}: {
  label: string;
  options: Option<K>[];
  value: K;
  onChange: (key: K) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const enabled = options.filter((o) => !o.disabled);
    const i = enabled.findIndex((o) => o.key === value);
    const next = enabled[(i + (e.key === "ArrowRight" ? 1 : enabled.length - 1)) % enabled.length];
    if (next) onChange(next.key);
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn("inline-flex flex-wrap gap-1 rounded-full bg-surface-muted p-1", className)}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.key)}
            className={cn(
              "focus-ring inline-flex items-center gap-2 rounded-full font-medium transition-[background-color,color,box-shadow] duration-150",
              size === "md" ? "h-9 px-4 text-sm" : "h-8 px-3 text-[13px]",
              active ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink",
              (disabled || o.disabled) && "opacity-50",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn("label-mono rounded-full px-1.5 py-0.5", active ? "bg-ink/5 text-ink" : "text-muted")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
