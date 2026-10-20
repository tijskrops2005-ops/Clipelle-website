import type { Project } from "@/lib/types";
import { languageOf } from "@/lib/languages";
import { DEFAULTS, estimateAdCost, estimateTranslateCost } from "@/lib/pricing";
import { speedValue } from "@/lib/voiceOptions";
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

/**
 * What one click was expected to cost, for projects that carry no estimate (demo projects):
 * the same numbers the forms show. Workflow B: per language version.
 */
export function projectEstimateUsd(project: Project) {
  if (project.estimateUsd !== undefined) return project.estimateUsd;
  if (project.workflow === "ad") {
    return estimateAdCost({ seconds: project.seconds ?? DEFAULTS.adSeconds, clipModel: DEFAULTS.clipModel, engine: project.engine ?? DEFAULTS.engine, speed: speedValue(project.speed) }).total;
  }
  return estimateTranslateCost({ seconds: project.sourceSeconds, quality: project.quality, enhance: false, languages: project.targetLanguages.length, hasSourceTranscript: project.sourceLanguage !== "auto" }).perLanguageTotal;
}

/** Wall-clock time of a finished project: first step start → last step finish, in ms; undefined when unknown. */
export function projectDurationMs(project: Project) {
  const steps = Object.values(project.steps);
  const starts = steps.map((s) => (s.startedAt ? Date.parse(s.startedAt) : NaN)).filter((n) => !Number.isNaN(n));
  const ends = steps.map((s) => (s.finishedAt ? Date.parse(s.finishedAt) : NaN)).filter((n) => !Number.isNaN(n));
  if (starts.length === 0 || ends.length === 0) return undefined;
  const ms = Math.max(...ends) - Math.min(...starts);
  return ms > 0 ? ms : undefined;
}
