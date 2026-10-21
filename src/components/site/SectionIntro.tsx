import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centered section header for the marketing pages: mono eyebrow, display title, one line. */
export function SectionIntro({ eyebrow, title, text, align = "center", className }: { eyebrow?: string; title: ReactNode; text?: ReactNode; align?: "center" | "left"; className?: string }) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "", className)}>
      {eyebrow && <p className="label-mono text-muted">{eyebrow}</p>}
      <h2 className="text-display mt-4">{title}</h2>
      {text && <p className="mt-4 text-subtitle text-muted">{text}</p>}
    </div>
  );
}
