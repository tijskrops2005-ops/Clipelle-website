/**
 * The four steps of a translation as the customer sees them (23 Nov 2026): the ONE list behind the
 * homepage strip, the platform page, the strip above the translate form, the cursor demo and the
 * dashboard explainer. Before this the site said four steps, the platform page three and the form
 * four with other names. Pure and browser-safe; the Dutch site reads the `nl` side.
 * (The database still has three steps, upload / translate / captions: voice and lips run inside the
 * captions step. `src/lib/translateProgress.ts` turns those into the plain-word checklist.)
 */
export type FlowLocale = "en" | "nl";
export type FlowKey = "upload" | "translate" | "voice" | "captions";

type Words = Record<FlowLocale, string>;

export const TRANSLATE_FLOW: { key: FlowKey; title: Words; presenterTitle?: Words; text: Words }[] = [
  {
    key: "upload",
    title: { en: "Upload", nl: "Uploaden" },
    text: {
      en: "Your video is checked and stored safely, together with your rights confirmation.",
      nl: "Je video wordt gecontroleerd en veilig opgeslagen, samen met je rechtenbevestiging.",
    },
  },
  {
    key: "translate",
    title: { en: "Translate and check", nl: "Vertalen en controleren" },
    text: {
      en: "The speech is translated and every line is checked against the original: missing words, numbers, names, natural phrasing.",
      nl: "De spraak wordt vertaald en elke regel wordt vergeleken met het origineel: ontbrekende woorden, getallen, namen, natuurlijke zinnen.",
    },
  },
  {
    key: "voice",
    title: { en: "Voice and lip sync", nl: "Stem en lipsync" },
    presenterTitle: { en: "AI presenter", nl: "AI-presentator" },
    text: {
      en: "The speaker's own voice says the new lines and the lips follow the new language.",
      nl: "De eigen stem van de spreker zegt de nieuwe regels en de lippen volgen de nieuwe taal.",
    },
  },
  {
    key: "captions",
    title: { en: "Captions and 9:16", nl: "Ondertitels en 9:16" },
    text: {
      en: "Captions in your style and the vertical format, or the original size. One file per language.",
      nl: "Ondertitels in jouw stijl en het verticale formaat, of het originele formaat. Eén bestand per taal.",
    },
  },
];

/** The four step names, in order. `presenter` swaps the third for the presenter flow. */
export function translateFlowTitles(locale: FlowLocale = "en", presenter = false): string[] {
  return TRANSLATE_FLOW.map((s) => (presenter && s.presenterTitle ? s.presenterTitle : s.title)[locale]);
}

/** Title and one sentence per step, for the numbered explainers. */
export function translateFlowSteps(locale: FlowLocale = "en"): { title: string; text: string }[] {
  return TRANSLATE_FLOW.map((s) => ({ title: s.title[locale], text: s.text[locale] }));
}
