import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

/**
 * Visible on every page while the app runs on simulated data (rule 3 in CLAUDE.md).
 * Renders nothing once config.demoMode is false.
 */
export function DemoModeBadge({ className }: { className?: string }) {
  if (!config.demoMode) return null;
  return (
    <span
      role="status"
      title="Simulated data. No real videos are generated yet."
      className={cn(
        "label-mono inline-flex h-8 items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 text-ink",
        className,
      )}
    >
      <FlaskConical className="size-3.5 text-warning" aria-hidden />
      Demo mode
    </span>
  );
}

/** Inline marker for simulated content: "Demo numbers", "Demo placeholder", … */
export function DemoBadge({ children, className }: { children: ReactNode; className?: string }) {
  if (!config.demoMode) return null;
  return (
    <Badge tone="warning" className={className}>
      <FlaskConical className="size-3 text-warning" aria-hidden />
      {children}
    </Badge>
  );
}
