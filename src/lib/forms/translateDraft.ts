import type { TranslateProjectDraft } from "@/lib/data/client";
import type { LanguageCode, TranslationQuality } from "@/lib/types";
import { config } from "@/lib/config";

/**
 * Pure helpers behind the "Translate a video" form: validation and the exact object that goes
 * to createTranslateProject. See adDraft.ts for why they live outside the component.
 */

export type TranslateFormErrors = Partial<Record<"video" | "projectName" | "targets" | "rights" | "form", string>>;

export type TranslateFormState = {
  video?: { file: File; seconds?: number };
  projectName: string;
  source: LanguageCode | "auto";
  targets: LanguageCode[];
  quality: TranslationQuality;
  rights: boolean;
  keepTerms: string;
  format: "original" | "9:16";
  enhance: boolean;
  trimSilence: boolean;
  captionPosition: "low" | "middle";
};

export function validateTranslateForm(s: TranslateFormState): TranslateFormErrors {
  const next: TranslateFormErrors = {};
  const tooLong = s.video?.seconds !== undefined && s.video.seconds > config.limits.translateVideoMaxSeconds;
  if (!s.video) next.video = "Add the video you want to translate.";
  else if (tooLong) next.video = `Videos up to ${config.limits.translateVideoMaxSeconds / 60} minutes for now.`;
  if (s.projectName.trim().length < 2) next.projectName = "Give the project a name so you can find it later.";
  if (s.targets.length === 0) next.targets = "Choose at least one target language.";
  if (!s.rights) next.rights = "We can only translate videos you own, with the speaker's consent. Tick the box to continue.";
  return next;
}

/** Comma- or newline-separated terms, trimmed, at most 20. */
export function parseKeepTerms(raw: string) {
  return raw.split(/[,\n]/).map((t) => t.trim()).filter(Boolean).slice(0, 20);
}

/** Exactly what the form sends to createTranslateProject. Requires a video (validated before). */
export function buildTranslateDraft(s: TranslateFormState & { video: { file: File; seconds?: number } }): TranslateProjectDraft {
  return {
    name: s.projectName.trim(),
    video: s.video.file,
    sourceSeconds: Math.round(s.video.seconds ?? 30),
    sourceLanguage: s.source,
    targetLanguages: s.targets,
    quality: s.quality,
    keepTerms: parseKeepTerms(s.keepTerms),
    format: s.format,
    enhance: s.enhance,
    trimSilence: s.trimSilence,
    captionPosition: s.captionPosition,
    rightsConfirmed: s.rights,
  };
}
