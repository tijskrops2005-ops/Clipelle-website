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

/** Presenter backgrounds the customer can pick (HeyGen `background.type: color`). "none" keeps the look's own. */
export const BACKGROUND_COLORS: { key: string; label: string; value: string }[] = [
  { key: "white", label: "White", value: "#FFFFFF" },
  { key: "light", label: "Light grey", value: "#F4F3EF" },
  { key: "sand", label: "Sand", value: "#E9DFCF" },
  { key: "sage", label: "Sage", value: "#D7DFD3" },
  { key: "ink", label: "Charcoal", value: "#1E1E22" },
];
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/* ---------- brand style for the final edit (Shotstack rich-text / rich-caption, verified 2026-10-19) ---------- */

/** Accent colours for hook sticker, CTA pill and the active caption word; "custom" = any hex the customer types. */
export const BRAND_COLORS: { key: string; label: string; value: string }[] = [
  { key: "coral", label: "Coral", value: "#D43F1B" },
  { key: "ink", label: "Charcoal", value: "#111114" },
  { key: "navy", label: "Navy", value: "#1F3A5F" },
  { key: "forest", label: "Forest", value: "#2F6B4F" },
  { key: "plum", label: "Plum", value: "#6B2D5C" },
  { key: "gold", label: "Gold", value: "#B8860B" },
];
export const DEFAULT_ACCENT = "#D43F1B";

/** Caption looks; each maps to a Shotstack rich-caption animation and active-word style. */
export const CAPTION_STYLES = ["bold", "clean", "karaoke"] as const;
export type CaptionStyle = (typeof CAPTION_STYLES)[number];
export const DEFAULT_CAPTION_STYLE: CaptionStyle = "bold";
export const CAPTION_STYLE_META: Record<CaptionStyle, { label: string; blurb: string }> = {
  bold: { label: "Bold pop", blurb: "Big uppercase words that pop in; the spoken word gets your colour." },
  clean: { label: "Clean", blurb: "Smaller sentence-case captions on a soft dark bar." },
  karaoke: { label: "Karaoke", blurb: "Whole line stays visible; words light up as they are spoken." },
};

/** Fonts built into Shotstack (no upload needed). Keys are the exact family names Shotstack expects. */
export const FONT_KEYS = ["Roboto", "Montserrat", "Open Sans", "Work Sans"] as const;
export type FontKey = (typeof FONT_KEYS)[number];
export const DEFAULT_FONT: FontKey = "Roboto";
export const FONT_META: Record<FontKey, { label: string; blurb: string }> = {
  Roboto: { label: "Roboto", blurb: "Neutral and sturdy. The default." },
  Montserrat: { label: "Montserrat", blurb: "Geometric, modern, a touch of fashion." },
  "Open Sans": { label: "Open Sans", blurb: "Friendly and very readable." },
  "Work Sans": { label: "Work Sans", blurb: "Clean and understated." },
};

/* ---------- contrast (WCAG relative luminance) ---------- */

function channel(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
export function luminance(hex: string) {
  const m = HEX_COLOR.test(hex) ? hex.slice(1) : "000000";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
/** Contrast ratio between two colours (1 to 21). Large text needs 3:1 (WCAG AA). */
export function contrastRatio(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export const MIN_LARGE_TEXT_CONTRAST = 3;
