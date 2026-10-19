import type { LanguageCode } from "@/lib/types";

/**
 * Customer choices for Workflow A that are not prices or lengths (those live in pricing.ts).
 * Browser-safe: the form, the project page and the server share these lists. Free-text fields
 * have hard maximum lengths and are always treated as data, never as instructions.
 */

export const AD_TONES = ["elegant", "playful", "direct", "warm"] as const;
export type AdTone = (typeof AD_TONES)[number];
/** "Direct" is the tone the script prompt always had: short, concrete, no hype. */
export const DEFAULT_TONE: AdTone = "direct";
export const TONE_META: Record<AdTone, { label: string; blurb: string; prompt: string }> = {
  elegant: { label: "Elegant", blurb: "Calm, refined, unhurried.", prompt: "Elegant: calm and refined; measured sentences, no exclamation marks, no slang." },
  playful: { label: "Playful", blurb: "Light, upbeat, a wink.", prompt: "Playful: light and upbeat with a friendly wink; short punchy sentences; still no hype adjectives and no exaggerated claims." },
  direct: { label: "Direct", blurb: "Short, concrete, to the point.", prompt: "Direct: short, concrete, to the point; say what it is and what it does." },
  warm: { label: "Warm", blurb: "Friendly, personal, reassuring.", prompt: "Warm: friendly and personal, as if talking to a friend; reassuring, never pushy." },
};
export function isAdTone(value: string): value is AdTone {
  return (AD_TONES as readonly string[]).includes(value);
}

export const OFFER_MAX_CHARS = 80;
export const DIRECTION_MAX_CHARS = 200;
export const DEFAULT_AD_LANGUAGE: LanguageCode = "en";

/** Fields the customer typed, bundled so the prompt can mark them as data. */
export type SellerInput = {
  offer?: string;
  direction?: string;
};
