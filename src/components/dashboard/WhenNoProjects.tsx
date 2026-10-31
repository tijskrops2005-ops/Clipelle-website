"use client";

import type { ReactNode } from "react";
import { useProjects, useProjectsReady } from "@/lib/data/client";

/** Renders its children only for an account without projects (31 Oct 2026): the explainer belongs to the first visit, not to every one. */
export function WhenNoProjects({ children }: { children: ReactNode }) {
  const projects = useProjects();
  const ready = useProjectsReady();
  if (!ready || projects.some((p) => !p.archivedAt)) return null;
  return <>{children}</>;
}
