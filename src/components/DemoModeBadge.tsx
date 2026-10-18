import { FlaskConical } from "lucide-react";
import { config } from "@/lib/config";
import { Badge } from "@/components/ui/Badge";

/**
 * Visible whenever the app runs on simulated data (rule 3 in CLAUDE.md).
 * Both variants render nothing once config.demoMode is false.
 */
export function DemoModeBadge({ className }: { className?: string }) {
  if (!config.demoMode) return null;
  return (
    <Badge tone="warning" className={className}>
      <FlaskConical className="size-3" aria-hidden />
      Demo mode
    </Badge>
  );
}

/** Slim banner shown above every app page so the label is never out of view. */
export function DemoModeBanner() {
  if (!config.demoMode) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs font-medium text-warning"
    >
      <FlaskConical className="size-3.5 shrink-0" aria-hidden />
      <span>
        Demo mode — this app runs on simulated data. No real videos are
        generated yet.
      </span>
    </div>
  );
}
