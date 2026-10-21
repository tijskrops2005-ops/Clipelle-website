import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Entrance on scroll, driven by CSS alone (`animation-timeline: view()` in globals.css): no observer,
 * no hidden content before hydration, static under "reduce motion" and in browsers without support.
 * `delay` staggers siblings.
 */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" | "article" }) {
  const style = delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined;
  return (
    <Tag className={cn("reveal", className)} style={style}>
      {children}
    </Tag>
  );
}
