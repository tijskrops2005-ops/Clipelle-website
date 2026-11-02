import type { AdProject, Project, TranslateProject } from "@/lib/types";

/**
 * Grouping of projects (2026-10-21), pure and shared by the screens and the data layers:
 * - "Make another version" of an ad: every version points at the first ad (the root) with
 *   `parentId`, numbered with `version`; the root itself has no parent and version 1.
 * - "Localize this ad": a translate project points at the ad it was made from with `parentId`.
 */

/** The first ad of the group this ad belongs to. */
export function rootIdOf(project: Pick<Project, "id" | "parentId" | "workflow">) {
  return project.workflow === "ad" && project.parentId ? project.parentId : project.id;
}

/** All versions of an ad (root and versions), oldest version first. Empty when there is only this one. */
export function otherVersionsOf(all: Project[], project: AdProject): AdProject[] {
  const rootId = rootIdOf(project);
  return all
    .filter((p): p is AdProject => p.workflow === "ad" && p.id !== project.id && (p.id === rootId || p.parentId === rootId))
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1));
}

/** Translate projects made from this ad, newest first (the list is already newest first). */
export function translationsOf(all: Project[], adId: string): TranslateProject[] {
  return all.filter((p): p is TranslateProject => p.workflow === "translate" && p.parentId === adId);
}

/** The ad a translate project was made from, when it still exists in the list. */
export function sourceAdOf(all: Project[], project: TranslateProject): AdProject | undefined {
  if (!project.parentId) return undefined;
  return all.find((p): p is AdProject => p.workflow === "ad" && p.id === project.parentId);
}

/** "Add a language" (31 Oct 2026): the earlier translation whose upload this project reuses. */
export function sourceTranslationOf(all: Project[], project: TranslateProject): TranslateProject | undefined {
  if (!project.parentId) return undefined;
  return all.find((p): p is TranslateProject => p.workflow === "translate" && p.id === project.parentId);
}

/** "Version 2 of Glow launch": the name a new version starts with; the base name loses an earlier prefix. */
export function versionName(name: string, version: number) {
  const base = name.replace(/^Version \d+ of /i, "").trim() || name;
  return `Version ${version} of ${base}`;
}

/** The number the next version of this ad will get. */
export function nextVersionNumber(all: Project[], project: AdProject) {
  const rootId = rootIdOf(project);
  const top = Math.max(1, ...all.filter((p) => p.workflow === "ad" && (p.id === rootId || p.parentId === rootId)).map((p) => p.version ?? 1));
  return top + 1;
}

/**
 * Edited versions (2 Nov 2026): an export points at the root of its group with `parentId` and carries
 * `edit`. For any project, the other members of its group (the root and every edited version),
 * oldest first. A translation made with "Add a language" is not a version of the other one.
 */
export function editVersionsOf(all: Project[], project: Project): Project[] {
  const rootId = project.edit ? project.parentId ?? project.id : project.id;
  return all
    .filter((p) => p.id !== project.id && p.workflow === project.workflow && (p.id === rootId || (p.parentId === rootId && Boolean(p.edit))))
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1));
}
