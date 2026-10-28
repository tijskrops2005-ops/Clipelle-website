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

/**
 * One glossary for every project running at the same time (28 Oct 2026). The service allows one
 * glossary per account, and each project used to overwrite it, so two translations with their own
 * words at once took each other's words away. Now the glossary holds the words of every running
 * project that has words (projects without words do not attach it), this project's own entries first:
 * where two projects disagree on the same term and language, this project's wish wins.
 */
export type GlossaryEntries = { keep: string[]; replace: { from: string; to: string; code?: string }[]; pronounce: { term: string; pronunciation: string; code: string }[] };

export function mergeGlossaries(own: GlossaryEntries, others: GlossaryEntries[]): GlossaryEntries {
  const out: GlossaryEntries = { keep: [], replace: [], pronounce: [] };
  const seen = { keep: new Set<string>(), replace: new Set<string>(), pronounce: new Set<string>() };
  for (const g of [own, ...others]) {
    for (const k of g.keep) {
      const key = k.trim().toLowerCase();
      if (!key || seen.keep.has(key)) continue;
      seen.keep.add(key);
      out.keep.push(k.trim());
    }
    for (const r of g.replace) {
      const key = `${r.from.trim().toLowerCase()}|${r.code ?? "all"}`;
      if (seen.replace.has(key)) continue;
      seen.replace.add(key);
      out.replace.push(r);
    }
    for (const p of g.pronounce) {
      const key = `${p.term.trim().toLowerCase()}|${p.code}`;
      if (seen.pronounce.has(key)) continue;
      seen.pronounce.add(key);
      out.pronounce.push(p);
    }
  }
  return out;
}
