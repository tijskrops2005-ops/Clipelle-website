"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Project } from "@/lib/types";

/**
 * Projects the server already fetched for this page (25 Nov 2026, speed): the first paint shows them
 * at once instead of after a second round trip to /api/projects. The client store takes over as soon
 * as its own first list arrives, and keeps polling as before. Nothing is kept across requests on the
 * server: the list travels as a prop of this one render.
 */
const InitialProjects = createContext<Project[] | undefined>(undefined);

export function ProjectsProvider({ initial, children }: { initial?: Project[]; children: ReactNode }) {
  return <InitialProjects.Provider value={initial}>{children}</InitialProjects.Provider>;
}

export function useInitialProjects() {
  return useContext(InitialProjects);
}
