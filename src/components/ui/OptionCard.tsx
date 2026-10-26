"use client";

import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type OptionCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  /** One or two lines under the title. */
  description?: ReactNode;
  /** Right side of the title row: a price, a badge. */
  meta?: ReactNode;
  /** Extra line in muted meta text under the description. */
  footnote?: ReactNode;
  /** Small element left of the title (colour swatch, icon). */
  leading?: ReactNode;
  /** A badge such as "Recommended", on its own line above the title so it never collides with the price. */
  badge?: ReactNode;
  disabled?: boolean;
  /** The plan that unlocks this option ("Pro"): shown as a lock badge, the card cannot be picked. */
  lockedTo?: string;
  /** "card" (default) is a bordered panel; "chip" is a compact pill for short labels. */
  size?: "card" | "chip";
  className?: string;
};

/**
 * One choice in a group of options (quality, tone, format, length). Behaves like a radio:
 * aria-pressed, keyboard focusable, selected state with an ink border and a check mark.
 */
export function OptionCard({ selected, onSelect, title, description, meta, footnote, leading, badge, disabled, lockedTo, size = "card", className }: OptionCardProps) {
  if (lockedTo) {
    disabled = true;
    meta = (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-surface">
        <Lock className="size-3" aria-hidden />
        {lockedTo}
      </span>
    );
  }
  if (size === "chip") {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
        className={cn(
          "focus-ring inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,box-shadow,transform] duration-150",
          selected ? "border-ink bg-ink text-surface shadow-soft" : "border-border bg-surface text-ink hover:border-ink/40 hover:bg-surface-muted",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        {leading}
        <span>{title}</span>
        {meta && <span className={cn("text-[13px]", selected ? "text-surface/80" : "text-muted")}>{meta}</span>}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "focus-ring relative flex w-full flex-col gap-1.5 rounded-panel border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150",
        selected ? "border-ink bg-surface shadow-[0_0_0_1px_var(--ink)]" : "border-border bg-surface hover:border-ink/30 hover:shadow-soft",
        disabled && (lockedTo ? "cursor-not-allowed opacity-70" : "pointer-events-none opacity-50"),
        className,
      )}
      aria-disabled={lockedTo ? true : undefined}
    >
      {badge && <span className="mb-0.5 block">{badge}</span>}
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          {leading}
          <span className="text-[15px] font-semibold text-ink">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {meta}
          <span
            aria-hidden
            className={cn(
              "grid size-5 place-items-center rounded-full border transition-colors duration-150",
              selected ? "border-ink bg-ink text-surface" : "border-border bg-surface text-transparent",
            )}
          >
            <Check className="size-3" strokeWidth={3} />
          </span>
        </span>
      </span>
      {description && <span className="text-[13px] leading-relaxed text-muted">{description}</span>}
      {footnote && <span className="text-[13px] leading-relaxed text-muted">{footnote}</span>}
    </button>
  );
}

/** Even grid for a row of OptionCards. */
export function OptionGrid({ columns = 2, children, className }: { columns?: 2 | 3 | 4; children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3", columns === 4 && "sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}
