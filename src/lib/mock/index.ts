import type { Project } from "@/lib/types";
import { mockProjects } from "./projects";

/**
 * Data access for the frontend skeleton. These functions are the contract the
 * real backend (Stage 8) will implement.
 *
 * - Server components can call getProjects() for the seed data.
 * - Client components use the reactive store in ./store (useProjects, addProject),
 *   which also holds projects the user creates in demo mode.
 */
export async function getProjects(): Promise<Project[]> {
  return [...mockProjects].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getRecentProjects(limit = 4): Promise<Project[]> {
  const all = await getProjects();
  return all.slice(0, limit);
}
