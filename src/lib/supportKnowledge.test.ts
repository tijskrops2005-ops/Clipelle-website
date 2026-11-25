import { describe, expect, it } from "vitest";
import { SUPPORT_SYSTEM, supportKnowledge } from "./supportKnowledge";

describe("support assistant knowledge", () => {
  const text = SUPPORT_SYSTEM + supportKnowledge();

  it("carries the facts customers ask about", () => {
    for (const fact of ["Video editor", "Enhance a video", "Enhance an image", "credits", "Settings → Billing", "32 MB", "free credits", "[[HUMAN]]"]) expect(text).toContain(fact);
  });

  it("names no provider behind the scenes", () => {
    expect(text).not.toMatch(/heygen|shotstack|fal\.ai|\bfal\b|topaz|replicate|anthropic|claude|elevenlabs/i);
  });

  it("stays small enough to cache cheaply", () => {
    expect(text.length).toBeLessThan(60_000);
  });
});
