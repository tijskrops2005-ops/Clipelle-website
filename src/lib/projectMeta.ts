import type { Project } from "@/lib/types";
import { languageOf } from "@/lib/languages";

/** Second line under a project title: the product (A) or the languages (B). */
export function projectSubtitle(project: Project) {
  if (project.workflow === "ad") return project.productName;
  return `Translation · ${project.targetLanguages.map((l) => languageOf(l).tag).join(", ")}`;
}

/** First product image (A) or nothing (B) — used as poster on tiles. */
export function projectPosterUrl(project: Project) {
  return project.workflow === "ad" ? project.imageUrls[0] : undefined;
}

/** Letter in the gradient poster when there is no image. */
export function projectMonogram(project: Project) {
  return project.workflow === "ad" ? project.productName.charAt(0) : project.name.charAt(0);
}

/** Number of finished videos a completed project holds (A: one, B: one per language). */
export function projectVideoCount(project: Project) {
  return project.workflow === "ad" ? 1 : project.targetLanguages.length;
}
