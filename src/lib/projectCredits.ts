import { adCredits, translateCredits } from "@/lib/plans";
import { DEFAULT_AD_SECONDS, DEFAULT_PRESENTER_ENGINE } from "@/lib/pricing";
import { SPEEDS } from "@/lib/voiceOptions";
import type { AdProject, Project, TranslateProject } from "@/lib/types";

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
  return p.workflow === "ad" ? adProjectCredits(p) : creditsPerLanguage(p) * p.targetLanguages.length;
}

/** What was really charged when the ledger has it (failed = 0), otherwise the rule. */
export function chargedCredits(p: Project) {
  return p.creditsUsed ?? projectCredits(p);
}
