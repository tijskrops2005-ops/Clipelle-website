import { CAPTION_PRESETS } from "@/lib/editRecipe";
import { VIDEO_MAX_SECONDS } from "@/lib/enhanceRules";

/**
 * The single-step media tools (25 Nov 2026, from the Vmake comparison): remove on-screen text, add
 * captions, resize to 9:16, remove a photo's background. Pure and browser-safe: what each tool is,
 * which file it takes, its options and what it costs in credits and in provider money. Jobs share the
 * enhancer's table (`enhance_jobs`, `kind` = the tool key). Margins are tested in mediaTools.test.ts.
 */
export type MediaToolKey = "remove-text" | "captions" | "resize" | "remove-background";
export type ResizeMode = "fill" | "fit";
export type CaptionFormat = "9:16" | "original";
export type MediaToolOptions = {
  /** captions: one of CAPTION_PRESETS; position and format. */
  preset?: string;
  position?: "low" | "middle";
  format?: CaptionFormat;
  /** resize: fill the frame (crop the sides) or fit the whole picture on a dimmed copy of itself. */
  mode?: ResizeMode;
};

export type MediaTool = {
  key: MediaToolKey;
  media: "video" | "image";
  label: string;
  title: string;
  description: string;
  /** What the provider charges, for the cost guard and the margin test. */
  usdPerSecond?: number;
  usdPerImage?: number;
};

/** Provider prices (checked 25 Nov 2026): Replicate GPU time, the render service, transcription, Bria on fal. */
export const MEDIA_USD = {
  textRemovalPerSecond: 4 * 0.0014,
  renderPerSecond: 0.1 / 30,
  transcribePerSecond: 0.0003,
  backgroundPerImage: 0.018,
} as const;

export const MEDIA_TOOLS: Record<MediaToolKey, MediaTool> = {
  "remove-text": { key: "remove-text", media: "video", label: "Remove on-screen text", title: "Remove on-screen text", description: "Take old captions, titles and stickers out of a video; the sound stays as it was.", usdPerSecond: MEDIA_USD.textRemovalPerSecond + MEDIA_USD.renderPerSecond },
  captions: { key: "captions", media: "video", label: "Add captions", title: "Add captions", description: "Captions of what is said, in the language of the video, in the style you pick.", usdPerSecond: MEDIA_USD.transcribePerSecond + MEDIA_USD.renderPerSecond },
  resize: { key: "resize", media: "video", label: "Resize to 9:16", title: "Resize to 9:16", description: "A landscape or square video as a vertical 1080 × 1920 video for Reels, TikTok and Shorts.", usdPerSecond: MEDIA_USD.renderPerSecond },
  "remove-background": { key: "remove-background", media: "image", label: "Remove background", title: "Remove background", description: "A product photo on a transparent background, ready for your shop or an ad.", usdPerImage: MEDIA_USD.backgroundPerImage },
};

export const MEDIA_TOOL_KEYS = Object.keys(MEDIA_TOOLS) as MediaToolKey[];
export const isMediaToolKey = (v: unknown): v is MediaToolKey => typeof v === "string" && v in MEDIA_TOOLS;

export const MEDIA_CREDITS = {
  "remove-text": { perSecond: 1, minimum: 10 },
  captions: { perTwoSeconds: 1, minimum: 5 },
  resize: { perTwoSeconds: 1, minimum: 5 },
  "remove-background": { perImage: 2 },
} as const;

/** Credits for a job: video by its length (rounded second), image per image. */
export function mediaCredits(tool: MediaToolKey, seconds?: number) {
  if (tool === "remove-background") return MEDIA_CREDITS["remove-background"].perImage;
  const s = Math.max(1, Math.round(seconds ?? 0));
  if (tool === "remove-text") return Math.max(MEDIA_CREDITS["remove-text"].minimum, s * MEDIA_CREDITS["remove-text"].perSecond);
  return Math.max(MEDIA_CREDITS[tool].minimum, Math.ceil(s / 2));
}

export function mediaEstimateUsd(tool: MediaToolKey, seconds?: number) {
  const t = MEDIA_TOOLS[tool];
  if (t.usdPerImage) return t.usdPerImage;
  return Math.round(Math.max(1, Math.round(seconds ?? 1)) * (t.usdPerSecond ?? 0) * 1000) / 1000;
}

export const MEDIA_MAX_SECONDS = VIDEO_MAX_SECONDS;

/** Options with defaults filled in and anything unknown dropped (also the server's validation). */
export function normaliseOptions(tool: MediaToolKey, o: MediaToolOptions = {}): MediaToolOptions {
  if (tool === "captions") {
    return { preset: CAPTION_PRESETS.some((p) => p.key === o.preset) ? o.preset : "bold", position: o.position === "middle" ? "middle" : "low", format: o.format === "original" ? "original" : "9:16" };
  }
  if (tool === "resize") return { mode: o.mode === "fit" ? "fit" : "fill" };
  return {};
}

/** A short line describing the chosen options, for the job list. */
export function optionsLabel(tool: MediaToolKey, o: MediaToolOptions = {}) {
  if (tool === "captions") return [CAPTION_PRESETS.find((p) => p.key === o.preset)?.label ?? "Bold box", o.format === "original" ? "Original size" : "9:16"].join(", ");
  if (tool === "resize") return o.mode === "fit" ? "Whole picture" : "Fill the frame";
  return "";
}

/**
 * Where a finished file can go next (25 Nov 2026, tools linked together): every tool that takes this
 * kind of file, except the one that made it. `from` is "job:<id>" or "project:<id>[:<language>]".
 */
export function nextToolsFor(media: "video" | "image", from: string, exclude?: string): { key: string; label: string; href: string }[] {
  const f = encodeURIComponent(from);
  const all =
    media === "video"
      ? [
          { key: "enhance-video", label: "Enhance", href: `/enhance?type=video&from=${f}` },
          { key: "resize", label: "Resize to 9:16", href: `/tools/resize?from=${f}` },
          { key: "captions", label: "Add captions", href: `/tools/captions?from=${f}` },
          { key: "remove-text", label: "Remove on-screen text", href: `/tools/remove-text?from=${f}` },
        ]
      : [
          { key: "enhance-image", label: "Enhance", href: `/enhance?type=image&from=${f}` },
          { key: "remove-background", label: "Remove background", href: `/tools/remove-background?from=${f}` },
        ];
  return all.filter((t) => t.key !== exclude);
}
