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
  it("has a branded HTML part with the picture, a download per version and escaped names", () => {
    const links = { logoUrl: "https://example.test/brand/logo.png", settingsUrl: "https://example.test/settings" };
    const one = composeProjectMail({ name: 'Glow <b>"launch"</b>', status: "completed", kind: "ad", url: "https://example.test/projects/1", downloads: [{ label: "Video", url: "https://example.test/projects/1?download=1" }], poster: { cid: "poster", width: 480, height: 854 }, links });
    expect(one.html).toContain('src="cid:poster"');
    expect(one.html).toContain('width="240"');
    expect(one.html).toContain("Download video");
    expect(one.html).toContain("https://example.test/projects/1?download=1");
    expect(one.html).toContain("https://example.test/brand/logo.png");
    expect(one.html).toContain("Turn them off");
    expect(one.html).not.toContain("<b>");
    expect(one.html).toContain("Glow &lt;b&gt;&quot;launch&quot;&lt;/b&gt;");
    expect(one.text).toContain("Download: https://example.test/projects/1?download=1");
    const many = composeProjectMail({ name: "Promo", status: "completed", kind: "translate", url: "u", downloads: [{ label: "Dutch", url: "u?download=nl" }, { label: "German", url: "u?download=de" }], links });
    expect(many.html).toContain("Dutch");
    expect(many.html).toContain("u?download=de");
    expect(many.html).not.toContain("cid:");
    expect(many.text).toContain("German: u?download=de");
    for (const t of [one.html, many.html]) expect(t).not.toMatch(/heygen|shotstack|fal\.ai|anthropic|claude/i);
  });
  it("sums a batch into one mail", () => {
    const partial = composeBatchMail({ name: "Mug", status: "partial", finished: 2, failed: 1, total: 3, url: "https://example.test/batches/1" });
    expect(partial.subject).toBe('2 of 3 variations of "Mug" are ready');
    expect(partial.text).toContain("2 of 3 variations are ready; 1 stopped.");
    expect(composeBatchMail({ name: "Mug", status: "completed", finished: 3, failed: 0, total: 3, url: "u" }).text).toContain("All 3 variations are ready");
  });
});
