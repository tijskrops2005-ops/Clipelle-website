import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createFalClient } from "@fal-ai/client";
import { z } from "zod";
import sharp from "sharp";
import { changedBand, joinBands } from "@/lib/changedBand";
import { workflowSettings } from "@/lib/workflow/settings";
import { claudeTokensToUsd, isScriptModel } from "@/lib/pricing";

/**
 * Where was the old text? (27 Oct 2026, Tijs) Text removal leaves a soft smudge where a big caption
 * line was, so our captions go exactly there, on a bar that covers it. Three frames of the
 * source (first, middle and last since 27 Oct 2026, fal.ai `fal-ai/ffmpeg-api/extract-frame`: `video_url`, `frame_type`
 * first | middle | last → `images[].url`, checked 27 Oct 2026) are shown to Claude, which returns
 * the box of the burned-in caption text as fractions of the frame.
 */
export const EXTRACT_FRAME_ENDPOINT = "fal-ai/ffmpeg-api/extract-frame";
/** Indicative: a frame grab is a second of compute; the vision check reads three small images. */
export const EXTRACT_FRAME_USD = 0.002;
export const LOCATE_TEXT_USD = 0.01;

export type TextBox = { top: number; bottom: number; left: number; right: number };

export class TextLocateError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "TextLocateError";
  }
}

export async function extractFrame(videoUrl: string, frameType: "first" | "middle" | "last"): Promise<string> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new TextLocateError("FAL_KEY is not set.", "missing_api_key");
  const fal = createFalClient({ credentials: key });
  const result = await fal.subscribe(EXTRACT_FRAME_ENDPOINT, { input: { video_url: videoUrl, frame_type: frameType } });
  const url = (result.data as { images?: { url?: string }[] }).images?.[0]?.url;
  if (!url) throw new TextLocateError("No frame came back from the video.", "no_frame");
  return url;
}

const Output = z.object({
  found: z.boolean().describe("true when the frames show caption or subtitle text burned into the picture"),
  top: z.number().min(0).max(1).nullable().describe("Top edge of the caption text block, as a fraction of the frame height (0 = top)"),
  bottom: z.number().min(0).max(1).nullable().describe("Bottom edge, fraction of the frame height"),
  left: z.number().min(0).max(1).nullable().describe("Left edge, fraction of the frame width"),
  right: z.number().min(0).max(1).nullable().describe("Right edge, fraction of the frame width"),
});

const SYSTEM = `You look at frames of a short vertical video. Find the burned-in caption or subtitle text: the line(s) of text that show what is said, usually in the lower or middle part of the picture. Ignore logos, watermarks, product labels and text that is part of the scene. Return one box around the caption text, including any box, pill or outline drawn behind it, as it appears across the frames (the union of all frames, so the widest line fits), as fractions of the frame (0 to 1). When there is no such text, return found false and nulls.`;

/** The box of the old caption text, or null when there was none. Cost is returned for the cost guard. */
export async function locateBurnedCaptions(frameUrls: string[]): Promise<{ box: TextBox | null; costUsd: number }> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new TextLocateError("ANTHROPIC_API_KEY is not set.", "missing_api_key");
  const client = new Anthropic({ apiKey: key });
  const model = workflowSettings.rewriteModel;
  const response = await client.messages.parse({
    model,
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: "user", content: [...frameUrls.map((url) => ({ type: "image" as const, source: { type: "url" as const, url } })), { type: "text" as const, text: "Where is the burned-in caption text?" }] }],
    output_config: { format: zodOutputFormat(Output), effort: "low" },
  });
  const costUsd = claudeTokensToUsd(isScriptModel(model) ? model : "claude-sonnet-5-5", response.usage.input_tokens, response.usage.output_tokens, response.usage.cache_read_input_tokens ?? 0);
  const p = response.parsed_output;
  if (!p?.found || p.top === null || p.bottom === null || p.left === null || p.right === null || p.bottom <= p.top || p.right <= p.left) return { box: null, costUsd };
  return { box: { top: p.top, bottom: p.bottom, left: p.left, right: p.right }, costUsd };
}

/**
 * The exact place of the removed text (27 Oct 2026): the same three moments of the source and of the
 * cleaned picture (same length and frame rate) are compared pixel by pixel; only the removal changed
 * them, so the changed band is the smudge. Free apart from the six frame grabs.
 */
export async function measureRemovedText(sourceUrl: string, cleanedUrl: string): Promise<TextBox | null> {
  const moments = ["first", "middle", "last"] as const;
  const frames = await Promise.all(moments.flatMap((m) => [extractFrame(sourceUrl, m), extractFrame(cleanedUrl, m)]));
  const bands = [];
  for (let i = 0; i < frames.length; i += 2) {
    const [a, b] = await Promise.all([greyPixels(frames[i]), greyPixels(frames[i + 1])]);
    bands.push(a.width === b.width && a.height === b.height ? changedBand(a.data, b.data, a.width, a.height) : null);
  }
  return joinBands(bands);
}

/** A frame as small greyscale pixels (180 wide is plenty to find a line of text). */
async function greyPixels(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new TextLocateError(`Could not read a frame (${res.status}).`, "frame_download");
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 180 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

