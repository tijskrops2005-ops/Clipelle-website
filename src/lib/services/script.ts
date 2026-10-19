import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CLAUDE_MODELS, claudeTokensToUsd, isScriptModel, type ScriptModel } from "@/lib/pricing";

/**
 * Step 2 — hook + script for one ad angle, via the Claude API (server-only).
 * Structured output guarantees valid JSON that matches AdScriptSchema.
 * Model and prices verified 2026-10-19 (see docs/vendors/anthropic/capabilities.md).
 */

export const SCRIPT_MODEL: ScriptModel = "claude-opus-5-5";
/** A product photo of up to ~1.15 megapixels costs at most this many input tokens. */
export const IMAGE_TOKEN_ALLOWANCE = 1600;

export const AD_ANGLES = ["problem_solution"] as const;
export type AdAngle = (typeof AD_ANGLES)[number];

export const AdScriptSchema = z.object({
  angle: z.enum(AD_ANGLES),
  language: z.string().describe("BCP-47 language of all text, e.g. en or nl"),
  hook: z.object({
    spoken: z.string().describe("The first sentence the presenter says, max 12 words"),
    onScreen: z.string().describe("Large on-screen text for the first 2 seconds, max 6 words"),
  }),
  presenterScript: z
    .string()
    .describe("Everything the presenter says, including the hook, in natural spoken sentences"),
  scenes: z
    .array(
      z.object({
        kind: z.enum(["hook", "presenter", "product", "benefits", "offer"]),
        seconds: z.number().describe("Planned duration of this scene in seconds"),
        onScreenText: z.string().nullable().describe("Short overlay text for this scene, or null"),
      }),
    )
    .describe("Scenes in order: hook, presenter, product, benefits, offer"),
  benefits: z.array(z.string()).describe("Exactly three benefits, max 6 words each"),
  offer: z.object({
    headline: z.string().describe("End card headline, max 8 words"),
    cta: z.string().describe("Call to action button text, max 4 words"),
  }),
  musicMood: z.string().describe("Two or three words describing the background music mood"),
});

export type AdScript = z.infer<typeof AdScriptSchema>;

export type ScriptInput = {
  productName: string;
  description: string;
  productUrl?: string;
  /** Extra direction from the user, e.g. target audience or tone. */
  hint?: string;
  /** Language code for the output, e.g. "en" or "nl". */
  language: string;
  /** Total ad length to plan for, in seconds. */
  targetSeconds: number;
  angle: AdAngle;
  /** Claude model; defaults to SCRIPT_MODEL. Prices per model live in src/lib/pricing.ts. */
  model?: ScriptModel;
  image?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" };
};

export type ScriptResult = {
  script: AdScript;
  model: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
  costUsd: number;
  stopReason: string | null;
};

export class ScriptError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "ScriptError";
  }
}

function requireApiKey() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new ScriptError(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      "missing_api_key",
    );
  }
  return key;
}

/** Rough pre-call estimate so the UI can ask for confirmation. */
export function estimateScriptCost(input: Omit<ScriptInput, "image"> & { hasImage: boolean }) {
  const model = resolveModel(input.model);
  const promptChars =
    SYSTEM_PROMPT.length + userPrompt(input).length;
  const inputTokens = Math.ceil(promptChars / 4) + (input.hasImage ? IMAGE_TOKEN_ALLOWANCE : 0);
  const outputTokens = 900;
  return {
    model,
    inputTokens,
    outputTokens,
    costUsd: claudeTokensToUsd(model, inputTokens, outputTokens, 0),
  };
}

/** Unknown or missing model names fall back to the default so a typo can never pick an unpriced model. */
export function resolveModel(model: string | undefined): ScriptModel {
  return model && isScriptModel(model) ? model : SCRIPT_MODEL;
}

export { CLAUDE_MODELS };

const SYSTEM_PROMPT = `You write short, direct-response video ads for e-commerce products, in the style of high-performing TikTok and Meta ads. The video is vertical 9:16 and has a fixed structure: hook (0-2 s), presenter talking to camera, product footage, three benefits as on-screen text, and an offer with a call to action.

Rules:
- Angle "problem_solution": open with the problem the viewer recognises, then present the product as the fix.
- Write for speech, not for reading: short sentences, concrete words, no hype adjectives, no emojis.
- Only use facts that are in the product information. Never invent prices, discounts, ingredients, certifications or reviews. If the information is thin, stay general rather than making claims up.
- The presenter speaks about 2.5 words per second. Size presenterScript to the planned presenter seconds.
- Scene seconds must add up to the requested total length.
- All text in the requested language.`;

function userPrompt(input: Omit<ScriptInput, "image">) {
  const lines = [
    `Product name: ${input.productName}`,
    `Description: ${input.description}`,
    input.productUrl ? `Product URL (context only, do not browse): ${input.productUrl}` : null,
    input.hint ? `Extra direction from the seller: ${input.hint}` : null,
    `Angle: ${input.angle}`,
    `Language: ${input.language}`,
    `Total length: ${input.targetSeconds} seconds (hook 2 s, presenter about ${Math.round(input.targetSeconds * 0.45)} s, product ${Math.round(input.targetSeconds * 0.2)} s, benefits ${Math.round(input.targetSeconds * 0.2)} s, offer the rest).`,
    "If a product photo is attached, use what you see (colour, shape, packaging) to make the script concrete.",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function generateAdScript(input: ScriptInput): Promise<ScriptResult> {
  const client = new Anthropic({ apiKey: requireApiKey() });
  const { image, ...rest } = input;
  const model = resolveModel(input.model);

  const content: Anthropic.ContentBlockParam[] = [];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64 },
    });
  }
  content.push({ type: "text", text: userPrompt(rest) });

  const response = await client.messages.parse({
    model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(AdScriptSchema), effort: "medium" },
  });

  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  };

  if (response.stop_reason === "refusal") {
    throw new ScriptError(
      "Claude declined to write this script. Adjust the product description and try again.",
      "refusal",
    );
  }
  if (!response.parsed_output) {
    throw new ScriptError("Claude returned an answer that did not match the script format.", "parse_failed");
  }

  return {
    script: response.parsed_output,
    model: response.model,
    usage,
    costUsd: claudeTokensToUsd(model, usage.inputTokens, usage.outputTokens, usage.cacheReadTokens),
    stopReason: response.stop_reason,
  };
}
