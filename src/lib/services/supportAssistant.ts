import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { claudeTokensToUsd } from "@/lib/pricing";
import { cachedSystem } from "@/lib/services/promptCache";
import { SUPPORT_SYSTEM, supportKnowledge } from "@/lib/supportKnowledge";

/**
 * The support assistant's one call (25 Nov 2026): the fixed instructions plus Clipelle's help texts
 * as a cached system prompt, the conversation as messages, a short plain-text answer. Opus 5.5 at low
 * effort (a chat answer needs little thinking); the server-side fallback answers when the model
 * declines for policy reasons. A reply ending in [[HUMAN]] tells the app to offer the team.
 */
export const SUPPORT_MODEL = "claude-opus-5-5" as const;
const HUMAN = "[[HUMAN]]";

export class SupportAssistantError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 500) {
    super(message);
    this.name = "SupportAssistantError";
  }
}

let system: string | null = null;
const systemPrompt = () => (system ??= SUPPORT_SYSTEM + supportKnowledge());

/** A rough upper estimate for the cost guard: the knowledge once uncached, a short answer. */
export function estimateSupportUsd(conversationChars: number) {
  return claudeTokensToUsd(SUPPORT_MODEL, Math.ceil((systemPrompt().length + conversationChars) / 4), 900);
}

export type SupportTurn = { role: "user" | "assistant"; content: string };

export async function answerSupport(turns: SupportTurn[]): Promise<{ answer: string; needsHuman: boolean; costUsd: number }> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new SupportAssistantError("The assistant is not set up.", "missing_api_key", 503);
  const client = new Anthropic({ apiKey: key, timeout: 60_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: SUPPORT_MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: cachedSystem(systemPrompt()),
      output_config: { effort: "low" },
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
    });
    const u = response.usage;
    const costUsd = claudeTokensToUsd(SUPPORT_MODEL, (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), u.output_tokens ?? 0, u.cache_read_input_tokens ?? 0);
    if (response.stop_reason === "refusal") return { answer: "I can't help with that here. Our support team can.", needsHuman: true, costUsd };
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const needsHuman = text.includes(HUMAN);
    const answer = text.replaceAll(HUMAN, "").trim() || "I don't know that one. Our support team can help.";
    return { answer, needsHuman: needsHuman || !text, costUsd };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new SupportAssistantError("The assistant is busy. Try again in a minute.", "busy", 429);
    if (error instanceof Anthropic.APIError) throw new SupportAssistantError("The assistant could not answer right now. Try again, or contact support.", "api_error", 502);
    throw error;
  }
}
