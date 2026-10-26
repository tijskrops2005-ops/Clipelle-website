import type { PresenterEngine } from "@/lib/pricing";
import { AD_LANGUAGE_CODES, type AdLanguageCode, type SpeedKey } from "@/lib/voiceOptions";

/**
 * "Translate with an AI presenter" (26 Oct 2026, Tijs): the video's words are translated and checked
 * as usual, then a presenter the customer picks speaks them, with the voice and accent they choose,
 * instead of the original speaker being lip-synced. Browser-safe; shared by the form, the schema and
 * the workflow. One target language per project, from the languages that have voices.
 */
export const PRESENTER_LAYOUTS = ["presenter", "overlay"] as const;
export type PresenterLayout = (typeof PRESENTER_LAYOUTS)[number];
export const PRESENTER_LAYOUT_META: Record<PresenterLayout, { title: string; text: string }> = {
  presenter: { title: "Presenter only", text: "The presenter fills the frame and speaks the translation." },
  overlay: { title: "Presenter over your video", text: "Your video plays muted behind; the presenter speaks in a box at the bottom." },
};

export type PresenterTranslate = {
  engine: PresenterEngine;
  /** Chosen look; empty = the default presenter. */
  lookId?: string;
  voiceId?: string;
  accent?: string;
  speed?: SpeedKey;
  layout: PresenterLayout;
};

/** Target languages the presenter flow offers: the ones with presenter voices. */
export const PRESENTER_LANGUAGES: AdLanguageCode[] = AD_LANGUAGE_CODES;
