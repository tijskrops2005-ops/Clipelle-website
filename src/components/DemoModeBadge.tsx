import { FlaskConical } from "lucide-react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

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
        "label-mono inline-flex h-8 items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 text-warning",
        className,
      )}
    >
      <FlaskConical className="size-3.5" aria-hidden />
      Demo mode
    </span>
  );
}
