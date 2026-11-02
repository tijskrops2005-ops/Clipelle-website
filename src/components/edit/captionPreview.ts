import { CAPTION_SIZE_PX, captionStyleOf, type CaptionStyleChoice } from "@/lib/captionOptions";

/**
 * The caption look as CSS for the edit screen's preview (2 Nov 2026): the same choices the render
 * uses (font size per 1080 px of width, capitals, the spoken word's box, colour or underline),
 * scaled to the preview's width. An approximation of the render, close enough to judge a style.
 */
export function captionCss(style: Partial<CaptionStyleChoice> | undefined, previewWidth: number) {
  const look = captionStyleOf(style);
  const scale = previewWidth / 1080;
  const fontPx = Math.max(9, CAPTION_SIZE_PX[look.size] * scale);
  const text = look.textColor ?? "#FFFFFF";
  const outline = text.toUpperCase() === "#FFFFFF" ? "#111114" : "#FFFFFF";
  const stroke = `${Math.max(1, 3 * scale)}px`;
  return {
    box: { fontSize: `${fontPx}px`, lineHeight: 1.25, fontWeight: 900, color: text, textTransform: look.uppercase ? ("uppercase" as const) : ("none" as const), WebkitTextStroke: `${stroke} ${outline}`, paintOrder: "stroke fill" as const, textAlign: "center" as const, width: "83%" },
    word: (active: boolean) => {
      if (!active || look.highlight === "none") return {};
      if (look.highlight === "box") return { background: look.color, color: isLight(look.color) ? "#111114" : text, borderRadius: `${4 * scale}px`, padding: `0 ${6 * scale}px`, WebkitTextStroke: "0" };
      if (look.highlight === "color") return { color: look.color };
      return { textDecoration: "underline", textDecorationColor: look.color, textDecorationThickness: `${Math.max(2, 5 * scale)}px` };
    },
  };
}

function isLight(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/** Which word of a line is being said at `t`: the words share the line's time evenly (the render's own pace is close to this). */
export function activeWordIndex(cue: { start: number; end: number; text: string }, t: number) {
  const words = cue.text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return -1;
  const f = (t - cue.start) / Math.max(0.1, cue.end - cue.start);
  return Math.min(words.length - 1, Math.max(0, Math.floor(f * words.length)));
}
