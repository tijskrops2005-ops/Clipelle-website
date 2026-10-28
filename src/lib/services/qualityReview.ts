import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { workflowSettings } from "@/lib/workflow/settings";
import { claudeTokensToUsd, isScriptModel } from "@/lib/pricing";
import { heygenFetch } from "@/lib/services/heygen";
import { CHECK_LABELS, type CheckStatus, type QualityCheck } from "@/lib/quality/report";

/**
 * The parts of the quality report that look at the finished video (28 Oct 2026). Admin only; the
 * customer never sees these. Every call is paid and goes through the cost guard in the caller:
 * - meaning: Claude compares every source line with the final line and names what was lost or added;
 * - frames: Claude looks at the first, middle and last frame of the finished video;
 * - transcription: the finished audio is transcribed again (HeyGen `POST /v3/audio/transcriptions`,
 *   model `scribe-v2`, synchronous, `Idempotency-Key` required; OpenAPI read 28 Oct 2026), so what is
 *   said can be compared with the captions.
 */

export class QualityReviewError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "QualityReviewError";
  }
}

function client() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new QualityReviewError("ANTHROPIC_API_KEY is not set.", "missing_api_key");
  return new Anthropic({ apiKey: key });
}

function usd(model: string, usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null }) {
  return claudeTokensToUsd(isScriptModel(model) ? model : "claude-sonnet-5-5", usage.input_tokens, usage.output_tokens, usage.cache_read_input_tokens ?? 0);
}

/** Estimates for the cost guard. */
export const REVIEW_MEANING_USD = 0.02;
export const REVIEW_FRAMES_USD = 0.02;
/** scribe-v2 is billed at the vendor's price per audio hour (well under $1); counted generously. */
export const TRANSCRIBE_USD_PER_SECOND = 0.0003;

/* ---------- meaning ---------- */

const MeaningOutput = z.object({
  status: z.enum(["pass", "warn", "fail"]).describe("pass: the full message is there; warn: small details lost; fail: a sentence, reason or the call to action is missing or wrong"),
  findings: z.array(z.string()).describe("Each finding in one short English sentence starting with the line number, e.g. 'Line 3: left out \"the way they are designed\"'. Empty when nothing is lost."),
  summary: z.string().describe("One short sentence"),
});

export async function reviewMeaning(input: { lines: { index: number; source: string; final: string }[]; targetLanguage: string; wishes?: string }): Promise<{ check: QualityCheck; costUsd: number }> {
  const model = workflowSettings.rewriteModel;
  const body = input.lines.map((l) => `#${l.index}\nsource: "${l.source.replace(/"/g, "'")}"\nfinal (${input.targetLanguage}): "${l.final.replace(/"/g, "'")}"`).join("\n\n");
  const wishes = input.wishes?.trim() ? `\nThe customer asked for these changes, so they are not mistakes: """${input.wishes.trim().replace(/"""/g, "'")}"""` : "";
  const response = await client().messages.parse({
    model,
    max_tokens: 1200,
    system: "You review a finished video translation line by line. Compare each final line with its source line and list only real losses or additions of meaning: a left-out clause, reason, feeling, number, name or the closing call to action, a reversed meaning, or a claim that is not in the source. Shortened fillers and natural rephrasing are fine. Be brief and concrete.",
    messages: [{ role: "user", content: `${wishes}\n\n${body}` }],
    output_config: { format: zodOutputFormat(MeaningOutput), effort: "low" },
  });
  const p = response.parsed_output;
  if (!p) throw new QualityReviewError("The meaning review returned an unexpected format.", "parse_failed");
  const check: QualityCheck = { key: "meaning", label: CHECK_LABELS.meaning, status: p.status, detail: p.summary, ...(p.findings.length ? { items: p.findings.slice(0, 12) } : {}) };
  return { check, costUsd: usd(model, response.usage) };
}

/* ---------- frames ---------- */

const Verdict = z.object({ status: z.enum(["pass", "warn", "fail"]), detail: z.string().describe("One short sentence on what you see") });
const FramesOutput = z.object({
  oldText: Verdict.describe("Is any old burned-in text left (other than the new captions on their bar or outline): leftover letters, a smudge, half a word? fail when readable old text is visible, warn for a visible smudge"),
  captions: Verdict.describe("Are the new captions readable, at most two lines, not cut off at the edges, the same size in every frame?"),
  ending: Verdict.describe("Look at the LAST frame: is it a clean picture, or is it caught mid-transition (washed out, half faded, a different scene bleeding in, blurred)? warn when slightly off, fail when clearly broken"),
  framing: Verdict.describe("Are the speaker's face and the product fully in the frame after the vertical crop (not cut off at the top or sides)?"),
});

export async function reviewFrames(input: { first: string; middle: string; last: string; captionsOn: boolean; overRemovedText: boolean }): Promise<{ checks: QualityCheck[]; costUsd: number }> {
  const model = workflowSettings.rewriteModel;
  const context = `The video is a translated short vertical video. ${input.captionsOn ? "New captions are drawn by us" + (input.overRemovedText ? " on a bar placed where old burned-in text was removed." : ".") : "Captions are off."} The three images are the first, the middle and the last frame, in that order.`;
  const response = await client().messages.parse({
    model,
    max_tokens: 800,
    system: "You check the picture quality of a finished short video from three frames. Judge only what you can see; be strict but fair, and keep every detail to one short sentence.",
    messages: [
      {
        role: "user",
        content: [
          ...[input.first, input.middle, input.last].map((url) => ({ type: "image" as const, source: { type: "url" as const, url } })),
          { type: "text" as const, text: context },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(FramesOutput), effort: "low" },
  });
  const p = response.parsed_output;
  if (!p) throw new QualityReviewError("The frame review returned an unexpected format.", "parse_failed");
  const make = (key: "oldText" | "captions" | "ending" | "framing", v: { status: CheckStatus; detail: string }): QualityCheck => ({ key, label: CHECK_LABELS[key], status: v.status, detail: v.detail });
  const checks = [
    ...(input.overRemovedText ? [make("oldText", p.oldText)] : []),
    ...(input.captionsOn ? [make("captions", p.captions)] : []),
    make("ending", p.ending),
    make("framing", p.framing),
  ];
  return { checks, costUsd: usd(model, response.usage) };
}

/* ---------- transcription ---------- */

type Transcription = { id: string; status: "pending" | "completed" | "failed"; language?: string | null; duration_seconds?: number | null; text?: string | null; segments?: { start: number; end: number; text: string }[] | null; failure_message?: string | null };

/** Transcribes a finished video from a public link; synchronous. The same key returns the stored result. */
export async function transcribeVideo(url: string, idempotencyKey: string, language?: string): Promise<{ text: string; language: string | null; seconds: number | null; spokenEnd: number | null }> {
  const t = await heygenFetch<Transcription>("/v3/audio/transcriptions", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ model: "scribe-v2", audio: { type: "url", url }, word_timestamps: false, diarize: false, ...(language ? { language } : {}) }),
    signal: AbortSignal.timeout(180_000),
  });
  if (t.status !== "completed" || typeof t.text !== "string") throw new QualityReviewError(t.failure_message ?? `The transcription is ${t.status}.`, "transcription_not_ready");
  const spokenEnd = t.segments?.length ? Math.max(...t.segments.map((s) => s.end)) : null;
  return { text: t.text, language: t.language ?? null, seconds: t.duration_seconds ?? null, spokenEnd };
}
