import { CAPTION_PRESETS } from "@/lib/editRecipe";
import { VIDEO_MAX_SECONDS } from "@/lib/enhanceRules";

/**
 * The single-step media tools (25 Nov 2026, from the Vmake comparison): remove on-screen text, add
 * captions, resize to 9:16, remove a photo's background. Pure and browser-safe: what each tool is,
 * which file it takes, its options and what it costs in credits and in provider money. Jobs share the
 * enhancer's table (`enhance_jobs`, `kind` = the tool key). Margins are tested in mediaTools.test.ts.
 */
export type MediaToolKey = "remove-text" | "captions" | "resize" | "remove-background" | "transcribe" | "video-background" | "clean-voice";
export type ResizeMode = "fill" | "fit";
export type CaptionFormat = "9:16" | "original";
export type MediaToolOptions = {
  /** captions: one of CAPTION_PRESETS; position and format. */
  preset?: string;
  position?: "low" | "middle";
  format?: CaptionFormat;
  /** resize: fill the frame (crop the sides) or fit the whole picture on a dimmed copy of itself. */
  mode?: ResizeMode;
  /** video-background: "transparent" (a WebM with alpha) or a #RRGGBB colour behind the subject. */
  background?: string;
  /** clean-voice: how hard the noise is pushed back. */
  strength?: "light" | "normal" | "strong";
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
  /** BEN v2 on fal: $0.001 per output megapixel; the worst case we accept is 1080p at 30 fps (sources above 1080p are refused). */
  videoBackgroundPerSecond1080p30: 1920 * 1080 / 1e6 * 30 * 0.001,
  videoBackgroundPerMegapixel: 0.001,
  /** VEED clean audio on fal: $0.0125 per started minute. */
  cleanVoicePerMinute: 0.0125,
  textRemovalPerSecond: 4 * 0.0014,
  renderPerSecond: 0.1 / 30,
  transcribePerSecond: 0.0003,
  backgroundPerImage: 0.018,
} as const;

export const MEDIA_TOOLS: Record<MediaToolKey, MediaTool> = {
  "remove-text": { key: "remove-text", media: "video", label: "Remove on-screen text", title: "Remove on-screen text", description: "Take old captions, titles and stickers out of a video; the sound stays as it was.", usdPerSecond: MEDIA_USD.textRemovalPerSecond + MEDIA_USD.renderPerSecond },
  captions: { key: "captions", media: "video", label: "Add captions", title: "Add captions", description: "Captions of what is said, in the language of the video, in the style you pick.", usdPerSecond: MEDIA_USD.transcribePerSecond + MEDIA_USD.renderPerSecond },
  resize: { key: "resize", media: "video", label: "Resize to 9:16", title: "Resize to 9:16", description: "A landscape or square video as a vertical 1080 × 1920 video for Reels, TikTok and Shorts.", usdPerSecond: MEDIA_USD.renderPerSecond },
  "video-background": { key: "video-background", media: "video", label: "Remove video background", title: "Remove video background", description: "The person or product cut out of a video, on a colour of your choice or transparent.", usdPerSecond: MEDIA_USD.videoBackgroundPerSecond1080p30 },
  "clean-voice": { key: "clean-voice", media: "video", label: "Clean up the voice", title: "Clean up the voice", description: "Background noise, hum and echo taken out of the speech; the picture stays as it was.", usdPerSecond: MEDIA_USD.cleanVoicePerMinute / 60 + MEDIA_USD.renderPerSecond },
  transcribe: { key: "transcribe", media: "video", label: "Video to text", title: "Video to text", description: "Everything that is said in a video, as text and as a subtitle file (SRT).", usdPerSecond: MEDIA_USD.transcribePerSecond },
  "remove-background": { key: "remove-background", media: "image", label: "Remove background", title: "Remove background", description: "A product photo on a transparent background, ready for your shop or an ad.", usdPerImage: MEDIA_USD.backgroundPerImage },
};

export const MEDIA_TOOL_KEYS = Object.keys(MEDIA_TOOLS) as MediaToolKey[];
export const isMediaToolKey = (v: unknown): v is MediaToolKey => typeof v === "string" && Object.hasOwn(MEDIA_TOOLS, v);

export const MEDIA_CREDITS = {
  "remove-text": { perSecond: 1, minimum: 10 },
  captions: { perTwoSeconds: 1, minimum: 5 },
  resize: { perTwoSeconds: 1, minimum: 5 },
  "remove-background": { perImage: 2 },
  transcribe: { perFiveSeconds: 1, minimum: 2 },
  "video-background": { perSecond: 3, minimum: 15 },
  "clean-voice": { perTwoSeconds: 1, minimum: 5 },
} as const;

/**
 * Video background: the provider bills output megapixels × frames, so a source above 1080p30 (more
 * pixels or more frames per second) costs more per second; the credits grow with it (26 Nov 2026).
 */
export function videoBackgroundFactor(video?: { width?: number | null; height?: number | null; fps?: number | null }) {
  if (!video?.width || !video?.height) return 1;
  return Math.max(1, (video.width * video.height) / (1920 * 1080)) * Math.max(1, (video.fps ?? 30) / 30);
}

/** Credits for a job: video by its length (rounded second), image per image. */
export function mediaCredits(tool: MediaToolKey, seconds?: number, video?: { width?: number | null; height?: number | null; fps?: number | null }) {
  if (tool === "remove-background") return MEDIA_CREDITS["remove-background"].perImage;
  const s = Math.max(1, Math.round(seconds ?? 0));
  if (tool === "remove-text") return Math.max(MEDIA_CREDITS["remove-text"].minimum, s * MEDIA_CREDITS["remove-text"].perSecond);
  if (tool === "transcribe") return Math.max(MEDIA_CREDITS.transcribe.minimum, Math.ceil(s / 5));
  if (tool === "video-background") return Math.max(MEDIA_CREDITS["video-background"].minimum, Math.ceil(s * MEDIA_CREDITS["video-background"].perSecond * videoBackgroundFactor(video)));
  return Math.max(MEDIA_CREDITS[tool].minimum, Math.ceil(s / 2));
}

export function mediaEstimateUsd(tool: MediaToolKey, seconds?: number) {
  const t = MEDIA_TOOLS[tool];
  if (t.usdPerImage) return t.usdPerImage;
  const s = Math.max(1, Math.round(seconds ?? 1));
  // Clean voice: the provider bills started minutes (1-minute minimum), the remux per second.
  if (tool === "clean-voice") return Math.round((Math.ceil(s / 60) * MEDIA_USD.cleanVoicePerMinute + s * MEDIA_USD.renderPerSecond) * 10000) / 10000;
  return Math.round(s * (t.usdPerSecond ?? 0) * 1000) / 1000;
}

/** Video background: the provider's price for this exact video (output megapixels × frames). */
export function videoBackgroundUsd(width: number, height: number, fps: number, seconds: number) {
  return Math.round(((width * height) / 1e6) * Math.max(1, fps) * Math.max(1, seconds) * MEDIA_USD.videoBackgroundPerMegapixel * 1000) / 1000;
}

/** Sources above this long side are refused for the video background tool (the price grows with the pixels). */
export const VIDEO_BACKGROUND_MAX_SIDE = 1920;

export const CLEAN_VOICE_STRENGTH: Record<NonNullable<MediaToolOptions["strength"]>, number> = { light: 0.6, normal: 0.874, strong: 1 };

export const MEDIA_MAX_SECONDS = VIDEO_MAX_SECONDS;

/** Options with defaults filled in and anything unknown dropped (also the server's validation). */
export function normaliseOptions(tool: MediaToolKey, o: MediaToolOptions = {}): MediaToolOptions {
  if (tool === "captions") {
    return { preset: CAPTION_PRESETS.some((p) => p.key === o.preset) ? o.preset : "bold", position: o.position === "middle" ? "middle" : "low", format: o.format === "original" ? "original" : "9:16" };
  }
  if (tool === "resize") return { mode: o.mode === "fit" ? "fit" : "fill" };
  if (tool === "video-background") return { background: o.background === "transparent" || /^#[0-9a-fA-F]{6}$/.test(o.background ?? "") ? (o.background as string) : "#FFFFFF" };
  if (tool === "clean-voice") return { strength: o.strength === "light" || o.strength === "strong" ? o.strength : "normal" };
  return {};
}

/** A short line describing the chosen options, for the job list. */
export function optionsLabel(tool: MediaToolKey, o: MediaToolOptions = {}) {
  if (tool === "captions") return [CAPTION_PRESETS.find((p) => p.key === o.preset)?.label ?? "Bold box", o.format === "original" ? "Original size" : "9:16"].join(", ");
  if (tool === "resize") return o.mode === "fit" ? "Whole picture" : "Fill the frame";
  if (tool === "video-background") return o.background === "transparent" ? "Transparent (WebM)" : `Background ${o.background ?? "#FFFFFF"}`;
  if (tool === "clean-voice") return o.strength === "light" ? "Light" : o.strength === "strong" ? "Strong" : "Normal";
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
          { key: "enhance-video", label: "Enhance", href: `/app/enhance?type=video&from=${f}` },
          { key: "resize", label: "Resize to 9:16", href: `/app/tools/resize?from=${f}` },
          { key: "captions", label: "Add captions", href: `/app/tools/captions?from=${f}` },
          { key: "remove-text", label: "Remove on-screen text", href: `/app/tools/remove-text?from=${f}` },
          { key: "clean-voice", label: "Clean up the voice", href: `/app/tools/clean-voice?from=${f}` },
          { key: "video-background", label: "Remove video background", href: `/app/tools/video-background?from=${f}` },
        ]
      : [
          { key: "enhance-image", label: "Enhance", href: `/app/enhance?type=image&from=${f}` },
          { key: "remove-background", label: "Remove background", href: `/app/tools/remove-background?from=${f}` },
        ];
  return all.filter((t) => t.key !== exclude);
}
