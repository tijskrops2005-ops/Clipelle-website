import { DEFAULT_CAPTION_STYLE, type CaptionStyleChoice } from "@/lib/captionOptions";
import { isTranslateLanguage } from "@/lib/translateLanguages";
import type { LanguageCode, TranslationQuality } from "@/lib/types";

/**
 * The choices of the last translation a customer started (31 Oct 2026), kept in this browser so
 * the next video can be dropped and started: target languages, quality, format, caption look and
 * sound. The form shows them as "Last time: DE, FR · Speed" with a Reset; the draft that is sent is
 * whatever the form shows, as before. Never the video, the name or the rights tick.
 */
export type LastChoices = {
  targets: LanguageCode[];
  quality: TranslationQuality;
  format: "original" | "9:16";
  captionPosition: "low" | "middle";
  captionStyle: CaptionStyleChoice;
  removeMusic: boolean;
  cleanVoice: boolean;
  at: string;
};

export const LAST_CHOICES_KEY = "clipelle.translate.last.v1";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The stored choices, checked field by field; anything odd or missing falls back to the default. */
export function readLastChoices(store: Store | null = storage()): LastChoices | null {
  try {
    const raw = store?.getItem(LAST_CHOICES_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastChoices> | null;
    if (!v || typeof v !== "object") return null;
    const targets = Array.isArray(v.targets) ? v.targets.filter((c): c is LanguageCode => typeof c === "string" && isTranslateLanguage(c)) : [];
    if (targets.length === 0) return null;
    const style = v.captionStyle && typeof v.captionStyle === "object" ? v.captionStyle : {};
    return {
      targets,
      quality: v.quality === "precision" ? "precision" : "speed",
      format: v.format === "original" ? "original" : "9:16",
      captionPosition: v.captionPosition === "middle" ? "middle" : "low",
      // Colours are never carried over (2 Nov 2026, Tijs): a new video starts with the default or brand colours.
      captionStyle: { ...DEFAULT_CAPTION_STYLE, ...Object.fromEntries(Object.entries(style).filter(([k]) => k in DEFAULT_CAPTION_STYLE && k !== "color" && k !== "textColor")) } as CaptionStyleChoice,
      removeMusic: v.removeMusic === true,
      cleanVoice: v.cleanVoice === true,
      at: typeof v.at === "string" ? v.at : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeLastChoices(choices: Omit<LastChoices, "at">, store: Store | null = storage()) {
  try {
    store?.setItem(LAST_CHOICES_KEY, JSON.stringify({ ...choices, at: new Date().toISOString() }));
  } catch {
    // Storage full or blocked: the next form simply starts from the defaults.
  }
}

export function clearLastChoices(store: Store | null = storage()) {
  try {
    store?.removeItem(LAST_CHOICES_KEY);
  } catch {
    // ignore
  }
}

/** "DE, FR · Precision · original size": the line on the chip. */
export function lastChoicesSummary(c: LastChoices, tagOf: (code: LanguageCode) => string) {
  const parts = [c.targets.map(tagOf).join(", "), c.quality === "precision" ? "Precision" : "Speed", c.format === "original" ? "original size" : "9:16"];
  if (!c.captionStyle.show) parts.push("no captions");
  return parts.join(" · ");
}
