import type { AdProjectDraft } from "@/lib/data/client";
import type { AdLength, PresenterEngine } from "@/lib/pricing";
import type { AdLanguageCode, SpeedKey } from "@/lib/voiceOptions";
import { BACKGROUND_COLORS, DEFAULT_ACCENT, DEFAULT_CAPTION_STYLE, DEFAULT_FONT, HEX_COLOR, type AdTone, type CaptionStyle, type FontKey } from "@/lib/adOptions";

/**
 * Pure helpers behind the "New ad" form: validation and the exact object that goes to
 * createAdProject. Kept outside the component so the UI can change shape while a test
 * proves the data sent to the workflow stays byte-for-byte the same.
 */

export type AdFormValues = {
  projectName: string;
  productName: string;
  productUrl: string;
  description: string;
  script: string;
  offer: string;
  direction: string;
};

export type AdFormErrors = Partial<Record<keyof AdFormValues | "images" | "form", string>>;

export const MIN_DESCRIPTION = 20;

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateAdForm(values: AdFormValues, imageCount: number): AdFormErrors {
  const errors: AdFormErrors = {};
  if (values.projectName.trim().length < 2) {
    errors.projectName = "Give the project a name so you can find it later.";
  }
  if (!values.productName.trim()) {
    errors.productName = "Enter the product name.";
  }
  if (values.productUrl.trim() && !isValidHttpUrl(values.productUrl.trim())) {
    errors.productUrl = "Enter a full link that starts with http:// or https://.";
  }
  if (values.description.trim().length < MIN_DESCRIPTION) {
    errors.description = `Describe the product in at least ${MIN_DESCRIPTION} characters.`;
  }
  if (imageCount === 0) {
    errors.images = "Add at least one product image.";
  }
  return errors;
}

/** The accent in effect: a valid custom hex wins over the picked swatch. */
export function effectiveAccentOf(accent: string, customAccent: string) {
  return HEX_COLOR.test(customAccent) ? customAccent.toUpperCase() : accent;
}

export type AdFormState = {
  values: AdFormValues;
  seconds: AdLength;
  engine: PresenterEngine;
  lookId?: string;
  /** "own", "image", or a key from BACKGROUND_COLORS. */
  backgroundChoice: string;
  backgroundImage?: File;
  accent: string;
  customAccent: string;
  captionStyle: CaptionStyle;
  font: FontKey;
  logo?: File;
  reviewScript: boolean;
  language: AdLanguageCode;
  voiceAccent?: string;
  voiceId?: string;
  speed: SpeedKey;
  tone: AdTone;
  images: File[];
  /** "Make another version": the ad this one is a version of. Absent = a new ad (the draft is unchanged). */
  parentId?: string;
  /** Format from the library. Absent = the draft is unchanged; present = one extra key, the fields it filled are already in `values` and `tone`. */
  format?: string;
};

/** Exactly what the form sends to createAdProject for a given state. */
export function buildAdDraft(s: AdFormState): AdProjectDraft {
  const effectiveAccent = effectiveAccentOf(s.accent, s.customAccent);
  return {
    // Only present for a version: an ordinary draft keeps exactly the keys it always had.
    ...(s.parentId ? { parentId: s.parentId } : {}),
    ...(s.format ? { format: s.format } : {}),
    name: s.values.projectName.trim(),
    seconds: s.seconds,
    engine: s.engine,
    lookId: s.lookId,
    background:
      s.backgroundChoice === "image" && s.backgroundImage
        ? { type: "image", file: s.backgroundImage }
        : s.backgroundChoice !== "own" && s.backgroundChoice !== "image"
          ? { type: "color", value: BACKGROUND_COLORS.find((c) => c.key === s.backgroundChoice)?.value ?? "#FFFFFF" }
          : undefined,
    brand: {
      accent: effectiveAccent !== DEFAULT_ACCENT ? effectiveAccent : undefined,
      captionStyle: s.captionStyle !== DEFAULT_CAPTION_STYLE ? s.captionStyle : undefined,
      font: s.font !== DEFAULT_FONT ? s.font : undefined,
      logo: s.logo,
    },
    reviewScript: s.reviewScript,
    language: s.language,
    accent: s.voiceAccent,
    voiceId: s.voiceId,
    speed: s.speed,
    offer: s.values.offer.trim() || undefined,
    direction: s.values.direction.trim() || undefined,
    tone: s.tone,
    productName: s.values.productName.trim(),
    productUrl: s.values.productUrl.trim() || undefined,
    description: s.values.description.trim(),
    script: s.values.script.trim() || undefined,
    images: s.images,
  };
}
