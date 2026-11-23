import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section header for the marketing pages: a display title and at most one line. The mono eyebrow is
 * gone since 23 Nov 2026 (docs/design-clarity.md); the prop stays so call sites keep compiling and
 * is ignored.
 */
export function SectionIntro({ title, text, align = "center", className }: { eyebrow?: string; title: ReactNode; text?: ReactNode; align?: "center" | "left"; className?: string }) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "", className)}>
      <h2 className="text-display">{title}</h2>
      {text && <p className="mt-4 text-subtitle text-muted">{text}</p>}
    </div>
  );
}
