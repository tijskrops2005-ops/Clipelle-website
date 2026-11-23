import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Entrance on scroll, driven by CSS alone (`animation-timeline: view()` in globals.css): no observer,
 * no hidden content before hydration, static under "reduce motion" and in browsers without support.
 * `delay` staggers siblings.
 */
export function Reveal({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; /** Kept for call sites; no longer used. */ delay?: number; as?: "div" | "section" | "li" | "article" }) {
  // Static since 23 Nov 2026 (docs/design-clarity.md): entrances on every section read as generated.
  // The `.reveal` keyframes stay in globals.css; put the class back here to turn them on again.
  return <Tag className={cn(className)}>{children}</Tag>;
}
