import { describe, expect, it } from "vitest";
import { composeBatchMail, composeProjectMail } from "./notificationMail";

describe("notification mails", () => {
  it("are short, carry the link and no provider names", () => {
    const ready = composeProjectMail({ name: "Glow launch", status: "completed", kind: "ad", url: "https://example.test/projects/1", recipientName: "Tijs Krops" });
    expect(ready.subject).toBe('Your ad "Glow launch" is ready');
    expect(ready.text).toContain("Hi Tijs,");
    expect(ready.text).toContain("https://example.test/projects/1");
    expect(ready.text.length).toBeLessThan(400);
    const stopped = composeProjectMail({ name: "Glow launch", status: "failed", kind: "translate", url: "https://example.test/projects/1", error: "The audio was too quiet." });
    expect(stopped.subject).toContain("stopped");
    expect(stopped.text).toContain("What happened: The audio was too quiet.");
    expect(stopped.text).toContain("refunded");
    for (const t of [ready.text, stopped.text]) expect(t).not.toMatch(/heygen|shotstack|fal\.ai|anthropic|claude/i);
  });
  it("sums a batch into one mail", () => {
    const partial = composeBatchMail({ name: "Mug", status: "partial", finished: 2, failed: 1, total: 3, url: "https://example.test/batches/1" });
    expect(partial.subject).toBe('2 of 3 variations of "Mug" are ready');
    expect(partial.text).toContain("2 of 3 variations are ready; 1 stopped.");
    expect(composeBatchMail({ name: "Mug", status: "completed", finished: 3, failed: 0, total: 3, url: "u" }).text).toContain("All 3 variations are ready");
  });
});
