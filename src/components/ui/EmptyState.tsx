import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card bg-surface px-6 py-12 text-center shadow-card sm:py-16",
        className,
      )}
    >
      {icon && (
        <div className="relative mb-5">
          <span className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)] opacity-70" aria-hidden />
          <div className="relative grid size-14 place-items-center rounded-full bg-surface text-muted shadow-card">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[15px] text-muted">{description}</p>
      )}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
