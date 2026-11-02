import { describe, expect, it } from "vitest";
import { cachedSystem, promptCacheEnabled } from "./promptCache";

describe("prompt caching", () => {
  it("marks the system prompt cacheable unless switched off", () => {
    expect(promptCacheEnabled({})).toBe(true);
    expect(promptCacheEnabled({ ANTHROPIC_PROMPT_CACHE: "off" })).toBe(false);
    expect(cachedSystem("rules", {})).toEqual([{ type: "text", text: "rules", cache_control: { type: "ephemeral" } }]);
    expect(cachedSystem("rules", { ANTHROPIC_PROMPT_CACHE: "off" })).toEqual([{ type: "text", text: "rules" }]);
  });
});
