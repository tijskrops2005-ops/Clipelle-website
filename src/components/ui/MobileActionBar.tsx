import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The main action of a long form, pinned to the bottom of the screen below `xl` (27 Oct 2026):
 * on a phone the summary card sits under the whole form, so the button was a long scroll away.
 * From `xl` the sticky summary panel takes over and this bar is not rendered. Pages that use it
 * add bottom padding (`pb-28 xl:pb-0`) so the last fields stay reachable above the bar.
 */
export function MobileActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(17,17,20,0.06)] backdrop-blur-sm xl:hidden", "pb-[max(12px,env(safe-area-inset-bottom))]", className)}>
      <div className="mx-auto max-w-[1120px]">{children}</div>
    </div>
  );
}
