/**
 * Caption choices for a translated video (26 Oct 2026, Tijs): captions on or off, how the spoken word
 * stands out, its colour, the size and capitals. One list for the form, the API schema and the edit
 * (`buildCaptionEdit` in services/finalEdit.ts). Mapped to Shotstack rich-caption fields that were
 * checked in the API reference on 26 Oct 2026: `active.font.color`, `active.font.background`,
 * `active.font.textDecoration: "underline"`, `style.textTransform`, `font.size`.
 * Browser-safe. The defaults are exactly the look every translation had before.
 */

export const CAPTION_HIGHLIGHTS = ["box", "color", "underline", "none"] as const;
export type CaptionHighlight = (typeof CAPTION_HIGHLIGHTS)[number];
export const CAPTION_HIGHLIGHT_META: Record<CaptionHighlight, { label: string; blurb: string }> = {
  box: { label: "Box", blurb: "A coloured block behind the word being spoken." },
  color: { label: "Colour", blurb: "The word being spoken changes colour." },
  underline: { label: "Underline", blurb: "The word being spoken is underlined in colour." },
  none: { label: "None", blurb: "All words look the same." },
};

export const CAPTION_COLORS = [
  { key: "red", label: "Red", value: "#D43F1B" },
  { key: "yellow", label: "Yellow", value: "#FFD400" },
  { key: "green", label: "Green", value: "#22C55E" },
  { key: "blue", label: "Blue", value: "#2563EB" },
  { key: "pink", label: "Pink", value: "#EC4899" },
  { key: "white", label: "White", value: "#FFFFFF" },
] as const;
export type CaptionColor = (typeof CAPTION_COLORS)[number]["value"];
export const CAPTION_COLOR_VALUES = CAPTION_COLORS.map((c) => c.value) as unknown as readonly [CaptionColor, ...CaptionColor[]];

/** Colour of the words themselves (26 Oct 2026); dark text gets a light outline so it stays readable. */
export const CAPTION_TEXT_COLORS = [
  { key: "white", label: "White", value: "#FFFFFF" },
  { key: "yellow", label: "Yellow", value: "#FFD400" },
  { key: "black", label: "Black", value: "#111114" },
] as const;
export type CaptionTextColor = (typeof CAPTION_TEXT_COLORS)[number]["value"];
export const CAPTION_TEXT_COLOR_VALUES = CAPTION_TEXT_COLORS.map((c) => c.value) as unknown as readonly [CaptionTextColor, ...CaptionTextColor[]];

/** True for colours where dark text reads better on top (yellow, white). */
export function isLightColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
}

export const CAPTION_SIZES = ["small", "medium", "large"] as const;
export type CaptionSize = (typeof CAPTION_SIZES)[number];
/** Font size in px on a 1080-wide frame. */
export const CAPTION_SIZE_PX: Record<CaptionSize, number> = { small: 48, medium: 62, large: 76 };

export type CaptionStyleChoice = {
  /** False: no captions at all, only the translated video (still cropped to 9:16 when chosen). */
  show: boolean;
  highlight: CaptionHighlight;
  color: CaptionColor;
  size: CaptionSize;
  uppercase: boolean;
  /** Colour of the words; missing on older projects = white. */
  textColor?: CaptionTextColor;
};

export const DEFAULT_CAPTION_STYLE: CaptionStyleChoice = { show: true, highlight: "box", color: "#D43F1B", size: "medium", uppercase: true, textColor: "#FFFFFF" };

/** The style with every missing field filled from the default (stored projects from before 26 Oct 2026 have none). */
export function captionStyleOf(style?: Partial<CaptionStyleChoice> | null): CaptionStyleChoice {
  return { ...DEFAULT_CAPTION_STYLE, ...(style ?? {}) };
}

export function isDefaultCaptionStyle(style: CaptionStyleChoice) {
  const d = DEFAULT_CAPTION_STYLE;
  return style.show === d.show && style.highlight === d.highlight && style.color === d.color && style.size === d.size && style.uppercase === d.uppercase && (style.textColor ?? "#FFFFFF") === d.textColor;
}

/** "Box · red · medium · capitals", or "Off": for summaries and the project page. */
export function describeCaptionStyle(style: CaptionStyleChoice) {
  if (!style.show) return "Off";
  const color = CAPTION_COLORS.find((c) => c.value === style.color)?.label.toLowerCase() ?? "";
  const highlight = style.highlight === "none" ? "No highlight" : `${CAPTION_HIGHLIGHT_META[style.highlight].label} · ${color}`;
  const text = style.textColor && style.textColor !== "#FFFFFF" ? ` · ${CAPTION_TEXT_COLORS.find((c) => c.value === style.textColor)?.label.toLowerCase()} text` : "";
  return `${highlight} · ${style.size}${style.uppercase ? " · capitals" : ""}${text}`;
}
