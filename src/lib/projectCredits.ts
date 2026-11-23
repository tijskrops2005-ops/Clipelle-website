import { adCredits, translateCredits } from "@/lib/plans";
import { DEFAULT_AD_SECONDS, DEFAULT_PRESENTER_ENGINE } from "@/lib/pricing";
import { SPEEDS } from "@/lib/voiceOptions";
import type { AdProject, Project, TranslateProject } from "@/lib/types";
import { exportCredits, outputSeconds } from "@/lib/editRecipe";

/**
 * Credits by the rule (plans.ts), for the screens (26 Oct 2026: customers see credits only, never
 * dollars). A whole ad, or one language version of a translation. Browser-safe.
 */
export function adProjectCredits(p: AdProject) {
  return adCredits({ seconds: p.seconds ?? DEFAULT_AD_SECONDS, engine: p.engine ?? DEFAULT_PRESENTER_ENGINE, speed: SPEEDS.find((s) => s.key === p.speed)?.value ?? 1 });
}

export function creditsPerLanguage(p: TranslateProject) {
  return translateCredits({ seconds: p.sourceSeconds, quality: p.quality, enhance: Boolean(p.enhance), removeText: Boolean(p.removeText), presenterEngine: p.speaker === "presenter" ? p.presenter?.engine : undefined });
}

/** What the project costs by the rule: the ad, or every language version. */
export function projectCredits(p: Project) {
  // An edited version (2 Nov 2026) costs its export.
  if (p.edit) return exportCredits(outputSeconds(p.edit.recipe));
  return p.workflow === "ad" ? adProjectCredits(p) : creditsPerLanguage(p) * p.targetLanguages.length;
}

/** What was really charged when the ledger has it (failed = 0), otherwise the rule. */
export function chargedCredits(p: Project) {
  return p.creditsUsed ?? projectCredits(p);
}

/**
 * What a credit is, in the one sentence every screen uses next to a balance (23 Nov 2026): credits
 * only, never minutes or hours. With ads on, the balance also reads as a number of 30 s Standard ads.
 */
export const CREDIT_RULE = "1 credit = 1 second of translated video";
export function creditsWorth(credits: number, ads: boolean) {
  if (ads) return `≈ ${Math.floor(credits / adCredits({ seconds: 30, engine: "avatar_iii" }))} ads`;
  return "1 per second of video";
}

/** Projects started since the 1st of this month (archived ones stay out, as on the Projects list). */
export function projectsThisMonth(projects: Pick<Project, "createdAt" | "archivedAt">[], now: number) {
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return projects.filter((p) => !p.archivedAt && Date.parse(p.createdAt) >= start.getTime()).length;
}
