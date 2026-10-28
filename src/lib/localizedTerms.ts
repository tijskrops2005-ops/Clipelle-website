import { languageOf } from "@/lib/languages";
import type { LanguageCode } from "@/lib/types";

/**
 * "Words to replace" per target language (28 Oct 2026, Tijs): the customer types the replacement
 * once ("the best set ever"), and every target language gets it in that language ("de beste set
 * ooit"), except brand and product names, which stay as written. Pure and browser-safe: the glossary
 * entries for the translation service and the list the quality check uses, per language.
 */
export type Replacement = { from: string; to: string };
export type LocalizedReplacements = Record<string, Replacement[]>;

/** The service wants a base language code ("nl", not "nl-BE"); our tags carry the region after a dash. */
export function glossaryLanguageCode(code: LanguageCode) {
  return languageOf(code).tag.split("-")[0].toLowerCase();
}

/**
 * Glossary entries: one per term and base language. Two targets that share a base language (Dutch and
 * Dutch (Belgium)) share one entry, the first one wins (the service refuses duplicates with 409).
 * Without a localized list the customer's text is used for every language, as before.
 */
export function glossaryReplacements(replace: Replacement[], localized: LocalizedReplacements | null | undefined, targets: LanguageCode[]): { from: string; to: string; code?: string }[] {
  if (!localized) return replace;
  const out: { from: string; to: string; code: string }[] = [];
  const seen = new Set<string>();
  for (const code of targets) {
    const base = glossaryLanguageCode(code);
    for (const r of localized[code] ?? []) {
      const key = `${r.from.toLowerCase()}|${base}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ from: r.from, to: r.to, code: base });
    }
  }
  return out;
}

/** The replacements the quality check of one language applies: the localized ones when there are. */
export function replacementsFor(code: LanguageCode, replace: Replacement[] | undefined, localized: LocalizedReplacements | null | undefined): Replacement[] {
  return localized?.[code]?.length ? localized[code] : replace ?? [];
}

/** Pronunciation entries for the glossary: one per name and base language, the first one wins. */
export function glossaryPronunciations(pronunciations: Record<string, { term: string; pronunciation: string }[]> | null | undefined, targets: LanguageCode[]) {
  if (!pronunciations) return [];
  const out: { term: string; pronunciation: string; code: string }[] = [];
  const seen = new Set<string>();
  for (const code of targets) {
    const base = glossaryLanguageCode(code);
    for (const p of pronunciations[code] ?? []) {
      const key = `${p.term.toLowerCase()}|${base}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ term: p.term, pronunciation: p.pronunciation, code: base });
    }
  }
  return out;
}
