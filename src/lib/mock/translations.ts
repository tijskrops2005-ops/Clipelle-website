import type { LanguageCode, Segment, TranslateProject, Translation } from "@/lib/types";
import { maxCharsForSegment } from "@/lib/translatePricing";

/**
 * MOCK TRANSLATIONS — demo only.
 * A six-fragment sample script in all five languages, plus a shorter "ad tone"
 * variant per language. The real workflow gets these from HeyGen (translation)
 * and Claude (ad-tone rewrite). Nothing here is a real translation of the user's video.
 */

/** Relative fragment timing (fractions of the video length) so any demo video gets plausible times. */
const SHAPE: Array<[number, number]> = [
  [0.0, 0.14],
  [0.15, 0.31],
  [0.32, 0.5],
  [0.51, 0.68],
  [0.69, 0.85],
  [0.86, 1.0],
];

const TEXTS: Record<LanguageCode, string[]> = {
  en: [
    "Hi, I'm Mara. I started this brand for one reason.",
    "No bottle kept my coffee hot all morning.",
    "So we built one. Steel, leak-proof, fits any bike.",
    "Cold for twenty-four hours, hot for twelve.",
    "Forty thousand shipped. The reviews say it all.",
    "Fifteen percent off this week. Tap the link.",
  ],
  de: [
    "Hallo, ich bin Mara. Diese Marke gibt es aus einem Grund.",
    "Keine Flasche hielt meinen Kaffee den ganzen Vormittag heiß.",
    "Also haben wir eine gebaut. Stahl, dicht, passt an jedes Rad.",
    "Vierundzwanzig Stunden kalt, zwölf Stunden heiß.",
    "Vierzigtausend verschickt. Die Bewertungen sagen alles.",
    "Diese Woche fünfzehn Prozent Rabatt. Tipp auf den Link.",
  ],
  fr: [
    "Bonjour, je suis Mara. J'ai lancé cette marque pour une raison.",
    "Aucune bouteille ne gardait mon café chaud toute la matinée.",
    "Alors on en a fait une. Acier, étanche, va sur tout vélo.",
    "Froid pendant vingt-quatre heures, chaud pendant douze.",
    "Quarante mille expédiées. Les avis parlent d'eux-mêmes.",
    "Quinze pour cent de remise cette semaine. Appuyez sur le lien.",
  ],
  nl: [
    "Hoi, ik ben Mara. Ik begon dit merk om één reden.",
    "Geen enkele fles hield mijn koffie de hele ochtend warm.",
    "Dus maakten we er een. Staal, lekvrij, past op elke fiets.",
    "Vierentwintig uur koud, twaalf uur warm.",
    "Veertigduizend verstuurd. De reviews zeggen genoeg.",
    "Deze week vijftien procent korting. Tik op de link.",
  ],
  sk: [
    "Ahoj, som Mara. Túto značku som založila z jedného dôvodu.",
    "Žiadna fľaša neudržala moju kávu horúcu celé dopoludnie.",
    "Tak sme ju vyrobili. Oceľ, nepretečie, sedí na každý bicykel.",
    "Dvadsaťštyri hodín studená, dvanásť hodín horúca.",
    "Štyridsaťtisíc odoslaných. Recenzie hovoria za všetko.",
    "Tento týždeň pätnásť percent zľava. Klikni na odkaz.",
  ],
};

/** Shorter, punchier variants: what the "Rewrite in ad tone" button returns in demo mode. */
const AD_TONE: Record<LanguageCode, string[]> = {
  en: [
    "I'm Mara. One reason I built this.",
    "Nothing kept my coffee hot.",
    "Steel. Leak-proof. Fits any bike.",
    "Cold 24 h. Hot 12 h.",
    "40,000 shipped. Reviews say it all.",
    "15% off this week. Tap the link.",
  ],
  de: [
    "Ich bin Mara. Ein Grund für diese Marke.",
    "Nichts hielt meinen Kaffee heiß.",
    "Stahl. Dicht. Passt an jedes Rad.",
    "24 h kalt. 12 h heiß.",
    "40.000 verschickt. Die Bewertungen sagen alles.",
    "15 % Rabatt diese Woche. Tipp auf den Link.",
  ],
  fr: [
    "Je suis Mara. Une seule raison.",
    "Rien ne gardait mon café chaud.",
    "Acier. Étanche. Va sur tout vélo.",
    "Froid 24 h. Chaud 12 h.",
    "40 000 expédiées. Les avis parlent.",
    "15 % cette semaine. Appuyez sur le lien.",
  ],
  nl: [
    "Ik ben Mara. Eén reden voor dit merk.",
    "Niets hield mijn koffie warm.",
    "Staal. Lekvrij. Past op elke fiets.",
    "24 uur koud. 12 uur warm.",
    "40.000 verstuurd. De reviews zeggen genoeg.",
    "15% korting deze week. Tik op de link.",
  ],
  sk: [
    "Som Mara. Jeden dôvod pre túto značku.",
    "Nič neudržalo moju kávu horúcu.",
    "Oceľ. Nepretečie. Sedí na každý bicykel.",
    "24 h studená. 12 h horúca.",
    "40 000 odoslaných. Recenzie hovoria za všetko.",
    "15 % zľava tento týždeň. Klikni na odkaz.",
  ],
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Demo source language: the user's choice, or English when "auto" (what the detector would "find"). */
export function demoDetectedLanguage(project: Pick<TranslateProject, "sourceLanguage">): LanguageCode {
  return project.sourceLanguage === "auto" ? "en" : project.sourceLanguage;
}

/**
 * Builds the six demo fragments for one target language, timed to the video length.
 * Demo timing assumes at least 30 s so the sample sentences fit the per-fragment limit;
 * real fragments come with their real timing from the translation service.
 */
export function demoSegments(sourceSeconds: number, source: LanguageCode, target: LanguageCode): Segment[] {
  const total = Math.max(30, sourceSeconds);
  return SHAPE.map(([from, to], i) => ({
    index: i + 1,
    start: round1(from * total),
    end: round1(to * total),
    original: TEXTS[source][i],
    translated: TEXTS[target][i],
    text: TEXTS[target][i],
  }));
}

/** The simulated "Rewrite in ad tone": shorter text per fragment, clipped to the per-fragment limit. */
export function demoAdToneRewrite(segments: Segment[], target: LanguageCode): Segment[] {
  return segments.map((s, i) => {
    const candidate = AD_TONE[target][i] ?? s.text;
    const max = maxCharsForSegment(s.start, s.end);
    return { ...s, text: candidate.length > max ? `${candidate.slice(0, max - 1).trimEnd()}…` : candidate };
  });
}

/** Translations for a fresh project: one entry per target language, no segments yet. */
export function emptyTranslations(targetLanguages: LanguageCode[]): Translation[] {
  return targetLanguages.map((language) => ({ language, status: "waiting", segments: [] }));
}
