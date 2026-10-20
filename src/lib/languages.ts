import type { LanguageCode } from "@/lib/types";
import { TRANSLATE_LANGUAGES, translateLanguageOf, type Language } from "@/lib/translateLanguages";

export type { Language };

/** Every supported language and regional variant, most-used first (see translateLanguages.ts). */
export const LANGUAGES: Language[] = TRANSLATE_LANGUAGES;

/** Plain names without a region, for short lists (the dev pages, demo texts). */
export const BASE_LANGUAGES: Language[] = TRANSLATE_LANGUAGES.filter((l) => l.heygenName === l.base);

export function languageOf(code: LanguageCode): Language {
  return translateLanguageOf(code) ?? { code, label: code, heygenName: code, tag: code.slice(0, 2).toUpperCase(), base: code };
}

export function languageLabel(code: LanguageCode | "auto") {
  return code === "auto" ? "Detect automatically" : languageOf(code).label;
}

/** Our code for a name the service reports (e.g. detected input language "Dutch" or "nl"). */
export function languageCodeForName(name: string | null | undefined): LanguageCode | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  const hit = TRANSLATE_LANGUAGES.find((l) => l.heygenName.toLowerCase() === n || l.code === n || l.base.toLowerCase() === n);
  return hit?.code ?? null;
}
