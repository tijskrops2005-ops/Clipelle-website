import type { LanguageCode } from "@/lib/types";

export type Language = {
  code: LanguageCode;
  /** Shown in the UI. */
  label: string;
  /** Short tag for tiles and badges. */
  tag: string;
  /** Name as HeyGen's translation API expects it (verified against the live list in /dev/translate). */
  heygenName: string;
};

/** The first five target languages of the translate workflow. Extend only when needed. */
export const LANGUAGES: Language[] = [
  { code: "sk", label: "Slovak", tag: "SK", heygenName: "Slovak" },
  { code: "de", label: "German", tag: "DE", heygenName: "German" },
  { code: "fr", label: "French", tag: "FR", heygenName: "French" },
  { code: "nl", label: "Dutch", tag: "NL", heygenName: "Dutch" },
  { code: "en", label: "English", tag: "EN", heygenName: "English" },
];

export function languageOf(code: LanguageCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[LANGUAGES.length - 1];
}

export function languageLabel(code: LanguageCode | "auto") {
  return code === "auto" ? "Detect automatically" : languageOf(code).label;
}
