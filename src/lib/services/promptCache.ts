/**
 * Prompt caching for the Claude calls (2 Nov 2026, cost round): the fixed system prompt of every
 * call is marked cacheable, so a second call within the cache window reads it at a tenth of the
 * price. Nothing about the answer changes (the model sees the same text). Prompts under the model's
 * minimum are simply not cached; the provider ignores the marker. ANTHROPIC_PROMPT_CACHE=off turns
 * the marker off.
 */
export type SystemBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

export function promptCacheEnabled(env: Record<string, string | undefined> = process.env) {
  return env.ANTHROPIC_PROMPT_CACHE !== "off";
}

/** The system prompt in the shape the SDK takes, cacheable unless switched off. */
export function cachedSystem(text: string, env: Record<string, string | undefined> = process.env): SystemBlock[] {
  return [promptCacheEnabled(env) ? { type: "text", text, cache_control: { type: "ephemeral" } } : { type: "text", text }];
}
