/**
 * Language, accent and speed choices for the presenter voice (browser-safe).
 * Verified against the public HeyGen voice list on 2026-10-19 (2,644 voices): voices carry a
 * `language` name, a gender and a preview URL, but NO locale field (`support_locale` is false on
 * every public voice). Accents can therefore only be read from the voice *name* (e.g. "US",
 * "British", "Vlaams", "Brazil"); an accent is offered only when at least one voice matches.
 */

export const AD_LANGUAGES = {
  en: { label: "English", heygenName: "English" },
  nl: { label: "Dutch", heygenName: "Dutch" },
  de: { label: "German", heygenName: "German" },
  fr: { label: "French", heygenName: "French" },
  es: { label: "Spanish", heygenName: "Spanish" },
  it: { label: "Italian", heygenName: "Italian" },
  pt: { label: "Portuguese", heygenName: "Portuguese" },
  sk: { label: "Slovak", heygenName: "Slovak" },
} as const;
export type AdLanguageCode = keyof typeof AD_LANGUAGES;
export const AD_LANGUAGE_CODES = Object.keys(AD_LANGUAGES) as AdLanguageCode[];
export function isAdLanguage(value: unknown): value is AdLanguageCode {
  return typeof value === "string" && value in AD_LANGUAGES;
}

export type AccentDef = { key: string; label: string; pattern: RegExp; /** Spelling/variant hint for the script. */ spelling?: string };
export const ACCENTS: Record<AdLanguageCode, AccentDef[]> = {
  en: [
    { key: "us", label: "US", pattern: /\bus\b|american/i, spelling: "American English spelling" },
    { key: "uk", label: "UK", pattern: /\buk\b|british|england/i, spelling: "British English spelling" },
    { key: "au", label: "Australian", pattern: /australia/i, spelling: "Australian English spelling" },
    { key: "in", label: "Indian", pattern: /\bindia/i },
    { key: "ie", label: "Irish", pattern: /\birish|ireland/i },
  ],
  nl: [{ key: "be", label: "Belgium (Flemish)", pattern: /vlaams|flemish|belg/i }],
  de: [
    { key: "at", label: "Austria", pattern: /austria|österreich/i },
    { key: "ch", label: "Switzerland", pattern: /swiss|schweiz/i },
  ],
  fr: [
    { key: "ca", label: "Canada", pattern: /canad|quebec|québec/i },
    { key: "be", label: "Belgium", pattern: /belg/i },
  ],
  es: [
    { key: "mx", label: "Mexico", pattern: /mexic/i },
    { key: "latam", label: "Latin America", pattern: /latin|latam|argentin|colombi/i },
    { key: "es", label: "Spain", pattern: /spain|castil/i },
  ],
  it: [],
  pt: [{ key: "br", label: "Brazil", pattern: /brazil|brasil/i }, { key: "pt", label: "Portugal", pattern: /portugal/i }],
  sk: [],
};

export function accentOf(voiceName: string, language: AdLanguageCode): string | undefined {
  return ACCENTS[language].find((a) => a.pattern.test(voiceName))?.key;
}

/** HeyGen `voice_settings.speed` accepts 0.5–1.5 (create-video.md, 2026-10-19). Three plain steps. */
export const SPEEDS = [
  { key: "slower", label: "Slower", value: 0.9 },
  { key: "normal", label: "Normal", value: 1 },
  { key: "faster", label: "Faster", value: 1.1 },
] as const;
export type SpeedKey = (typeof SPEEDS)[number]["key"];
export const DEFAULT_SPEED: SpeedKey = "normal";
export function speedValue(key: string | undefined) {
  return SPEEDS.find((s) => s.key === key)?.value ?? 1;
}
export function isSpeedKey(value: unknown): value is SpeedKey {
  return typeof value === "string" && SPEEDS.some((s) => s.key === value);
}

/** What the picker shows for one voice; provider names and ids never appear as text. */
export type VoiceOption = { id: string; name: string; gender: "female" | "male" | "other"; previewUrl?: string; accent?: string };
export type VoiceOptions = {
  /** Languages that have at least one voice, in our order. */
  languages: { code: AdLanguageCode; label: string; voices: number }[];
  /** Accents that exist for the requested language (from voice names). */
  accents: { key: string; label: string; voices: number }[];
  voices: VoiceOption[];
  /** The look's default voice when it matches the language, else the first matching voice. */
  defaultId: string | null;
};
