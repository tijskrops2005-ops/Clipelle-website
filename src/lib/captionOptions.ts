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

/**
 * Colour of the words themselves (26 Oct 2026; every colour since 28 Oct 2026, also on a background).
 * Dark text gets a light outline. On a background a colour that would not read (white on white) turns
 * to the contrasting one: `readableOn`.
 */
export const CAPTION_TEXT_COLORS = [
  { key: "white", label: "White", value: "#FFFFFF" },
  { key: "black", label: "Black", value: "#111114" },
  { key: "yellow", label: "Yellow", value: "#FFD400" },
  { key: "red", label: "Red", value: "#D43F1B" },
  { key: "green", label: "Green", value: "#22C55E" },
  { key: "blue", label: "Blue", value: "#2563EB" },
  { key: "pink", label: "Pink", value: "#EC4899" },
] as const;
export type CaptionTextColor = (typeof CAPTION_TEXT_COLORS)[number]["value"];
export const CAPTION_TEXT_COLOR_VALUES = CAPTION_TEXT_COLORS.map((c) => c.value) as unknown as readonly [CaptionTextColor, ...CaptionTextColor[]];

/** The text colour on a background: the chosen one when it reads there, else black or white. */
export function readableOn(text: string, background: string) {
  // Real contrast (28 Oct 2026): green on a white bar passed the old light/dark test and was hard to read.
  // Bold caption text needs at least 3:1 (WCAG for large text); otherwise black or white, whichever reads best.
  if (contrastRatio(text, background) >= 3) return text;
  return contrastRatio("#111114", background) >= contrastRatio("#FFFFFF", background) ? "#111114" : "#FFFFFF";
}

/** WCAG relative luminance of a #rrggbb colour, 0 (black) to 1 (white). */
export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** WCAG contrast ratio of two colours, 1 to 21. */
export function contrastRatio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * The outline around caption words without a bar (28 Oct 2026, Tijs: red, green, blue and pink were
 * hard to read; only yellow was clear). Every colour gets a black outline, the way short-video
 * captions are read on any picture; only (near-)black words get a white one.
 */
export function outlineFor(text: string) {
  return luminance(text) < 0.05 ? "#FFFFFF" : "#111114";
}

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
  /** With text removal: the bar behind the captions where the old text was (27 Oct 2026). */
  bar?: CaptionBar;
};

/**
 * A background that wraps the caption text (27 Oct 2026, Shotstack `background.wrap`: the box shrinks
 * to the text plus padding and only shows while a line is on screen). Words turn dark on a light box.
 */
export const CAPTION_BARS = ["none", "white", "cream", "yellow", "dark"] as const;
export type CaptionBar = (typeof CAPTION_BARS)[number];
export const CAPTION_BAR_META: Record<CaptionBar, { label: string; color: string | null; opacity: number }> = {
  // (28 Oct 2026) shown as colour swatches on the form; the labels are their accessible names.
  none: { label: "None", color: null, opacity: 0 },
  white: { label: "White", color: "#FFFFFF", opacity: 0.92 },
  cream: { label: "Cream", color: "#F6F1E7", opacity: 0.94 },
  yellow: { label: "Yellow", color: "#FFD400", opacity: 0.95 },
  dark: { label: "Dark", color: "#111114", opacity: 0.8 },
};
/** The background in use: the customer's pick, else white over removed text and none otherwise. */
export function effectiveBar(style: Pick<CaptionStyleChoice, "bar">, overOldText: boolean): CaptionBar {
  // Over removed text there is always a bar (29 Oct 2026, Tijs: without one the smudge and leftover letters show).
  if (overOldText) return style.bar && style.bar !== "none" ? style.bar : "white";
  return style.bar ?? "none";
}

/**
 * The caption style when on-screen text is removed (29 Oct 2026, Tijs): captions always on and always on a
 * bar, because the new captions are what hides the cleaned spot. Without text removal every choice stays free.
 */
export function styleOverRemovedText(style: Partial<CaptionStyleChoice> | null | undefined): Partial<CaptionStyleChoice> {
  const s: Partial<CaptionStyleChoice> = style ?? {};
  return { ...s, show: true, bar: s.bar && s.bar !== "none" ? s.bar : "white" };
}

/**
 * A background on which the text colour reads (29 Oct 2026, Tijs: yellow and green on white silently
 * turned black). Keeps the current bar when it reads; otherwise dark for light text, white for dark text.
 */
export function barForText(text: string, current: CaptionBar, overOldText: boolean): CaptionBar {
  const meta = CAPTION_BAR_META[current];
  if (!meta.color || contrastRatio(text, meta.color) >= 3) return current;
  const order: CaptionBar[] = luminance(text) > 0.3 ? ["dark", "white", "cream", "yellow"] : ["white", "cream", "yellow", "dark"];
  return order.find((b) => contrastRatio(text, CAPTION_BAR_META[b].color!) >= 3) ?? (overOldText ? "dark" : "none");
}

/** The bars that can be chosen: no "none" over removed text. */
export function barChoices(overOldText: boolean): readonly CaptionBar[] {
  return overOldText ? CAPTION_BARS.filter((b) => b !== "none") : CAPTION_BARS;
}

export const DEFAULT_CAPTION_STYLE: CaptionStyleChoice = { show: true, highlight: "box", color: "#D43F1B", size: "medium", uppercase: true, textColor: "#FFFFFF" };

/** The style with every missing field filled from the default (stored projects from before 26 Oct 2026 have none). */
export function captionStyleOf(style?: Partial<CaptionStyleChoice> | null): CaptionStyleChoice {
  return { ...DEFAULT_CAPTION_STYLE, ...(style ?? {}) };
}

export function isDefaultCaptionStyle(style: CaptionStyleChoice) {
  const d = DEFAULT_CAPTION_STYLE;
  return style.show === d.show && style.highlight === d.highlight && style.color === d.color && style.size === d.size && style.uppercase === d.uppercase && (style.textColor ?? "#FFFFFF") === d.textColor && style.bar === undefined;
}

/** "Box · red · medium · capitals", or "Off": for summaries and the project page. */
export function describeCaptionStyle(style: CaptionStyleChoice) {
  if (!style.show) return "Off";
  const color = CAPTION_COLORS.find((c) => c.value === style.color)?.label.toLowerCase() ?? "";
  const highlight = style.highlight === "none" ? "No highlight" : `${CAPTION_HIGHLIGHT_META[style.highlight].label} · ${color}`;
  const text = style.textColor && style.textColor !== "#FFFFFF" ? ` · ${CAPTION_TEXT_COLORS.find((c) => c.value === style.textColor)?.label.toLowerCase()} text` : "";
  return `${highlight} · ${style.size}${style.uppercase ? " · capitals" : ""}${text}`;
}
