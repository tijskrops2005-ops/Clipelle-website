import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { workflowSettings } from "@/lib/workflow/settings";
import { languageOf } from "@/lib/languages";
import type { LanguageCode } from "@/lib/types";
import { maxCharsForSegment } from "@/lib/translatePricing";
import { claudeTokensToUsd, isScriptModel } from "@/lib/pricing";

/**
 * Workflow B, step "Review" — Claude rewrites translated subtitle fragments in ad tone.
 *
 * Hard rules enforced here, not only in the prompt:
 * - same number of fragments, same order, same timing (times never leave this function);
 * - every fragment within its character limit (duration × 15 chars/s), so the new voice
 *   fits the original timing and lip-sync stays plausible;
 * - the model may not add claims, numbers, prices or promises that are not in the source.
 */

export type ToneSegment = {
  index: number;
  start: number;
  end: number;
  /** Source-language text (context for the model; may be empty). */
  original: string;
  /** Current translated text to rewrite. */
  text: string;
};

const Output = z.object({
  fragments: z
    .array(
      z.object({
        index: z.number().int().describe("Fragment index, unchanged"),
        text: z.string().describe("Rewritten fragment in the target language, within its character limit"),
      }),
    )
    .describe("Exactly one entry per input fragment, in the same order"),
});

export type RewriteResult = {
  segments: ToneSegment[];
  /** Fragments the model still left over the limit; the UI shows them in red. */
  violations: { index: number; length: number; max: number }[];
  usage: { inputTokens: number; outputTokens: number };
  costUsd: number;
};

export class AdToneError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 500) {
    super(message);
    this.name = "AdToneError";
  }
}

function requireApiKey() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new AdToneError("ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.", "missing_api_key");
  return key;
}

/** Prices per model live in src/lib/pricing.ts (CLAUDE_MODELS); unknown names are priced as Opus 5.5. */
function usdFor(model: string, inputTokens: number, outputTokens: number, cacheReadTokens = 0) {
  return claudeTokensToUsd(isScriptModel(model) ? model : "claude-opus-5-5", inputTokens, outputTokens, cacheReadTokens);
}

/** Rough pre-call estimate: ~4 characters per token, output about the size of the input text. */
export function estimateRewriteUsd(segments: ToneSegment[]) {
  const chars = segments.reduce((n, s) => n + s.text.length + s.original.length, 0) + 1200;
  const inputTokens = Math.ceil(chars / 4);
  const outputTokens = Math.ceil(segments.reduce((n, s) => n + s.text.length, 0) / 4) + 60;
  return usdFor(workflowSettings.rewriteModel, inputTokens, outputTokens);
}

const SYSTEM = `You rewrite subtitle fragments of a short product video into direct, confident advertising copy.
Rules:
- Keep the meaning. Never add claims, numbers, prices, guarantees or calls to action that are not in the fragment or its original.
- Short, spoken sentences. No hashtags, no emoji, no exclamation spam.
- Keep brand and product names exactly as written.
- Write only in the requested target language.
- Each fragment has a strict character limit. Stay under it; shorten rather than cut mid-sentence.
- Return exactly one entry per fragment, same index, same order. Do not merge or split fragments.`;

export async function rewriteSegmentsInAdTone(input: { segments: ToneSegment[]; language: LanguageCode }): Promise<RewriteResult> {
  const client = new Anthropic({ apiKey: requireApiKey() });
  const target = languageOf(input.language).label;
  const lines = input.segments.map((s) => {
    const max = maxCharsForSegment(s.start, s.end);
    const orig = s.original ? ` | original: "${s.original.replace(/"/g, "'")}"` : "";
    return `#${s.index} (${(s.end - s.start).toFixed(1)} s, max ${max} chars)${orig}\n${s.text}`;
  });

  const response = await client.messages.parse({
    model: workflowSettings.rewriteModel,
    max_tokens: 2500,
    system: SYSTEM,
    messages: [{ role: "user", content: `Target language: ${target}\nFragments:\n\n${lines.join("\n\n")}` }],
    output_config: { format: zodOutputFormat(Output), effort: "low" },
  });

  const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  const costUsd = usdFor(workflowSettings.rewriteModel, usage.inputTokens, usage.outputTokens, response.usage.cache_read_input_tokens ?? 0);

  if (response.stop_reason === "refusal") throw new AdToneError("Claude declined to rewrite this text.", "refusal", 422);
  const parsed = response.parsed_output;
  if (!parsed) throw new AdToneError("Claude returned an answer that did not match the expected format.", "parse_failed", 502);
  if (parsed.fragments.length !== input.segments.length) {
    throw new AdToneError(
      `Claude returned ${parsed.fragments.length} fragments for ${input.segments.length}. Nothing was changed; try again.`,
      "count_mismatch",
      502,
    );
  }

  const byIndex = new Map(parsed.fragments.map((f) => [f.index, f.text.trim()]));
  const violations: RewriteResult["violations"] = [];
  const segments = input.segments.map((s) => {
    const text = byIndex.get(s.index) ?? s.text;
    const max = maxCharsForSegment(s.start, s.end);
    if (text.length > max) violations.push({ index: s.index, length: text.length, max });
    return { ...s, text };
  });

  return { segments, violations, usage, costUsd };
}
