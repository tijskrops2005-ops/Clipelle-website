import { describe, expect, it } from "vitest";

/**
 * Ads are off unless NEXT_PUBLIC_ADS_ENABLED=true (27 Oct 2026): the server refuses to start one,
 * the tool lists announce them, and the site menu marks them "soon". The tests run without the flag.
 */
describe("ads feature flag (off)", () => {
  it("is off by default", async () => {
    const { config } = await import("@/lib/config");
    expect(config.features.ads).toBe(false);
  });

  it("refuses to start an ad with a 403 and a plain message", async () => {
    const { adsEnabledOnly, ADS_COMING_SOON } = await import("@/app/api/projects/_guard");
    const r = adsEnabledOnly();
    expect(r?.status).toBe(403);
    const body = (await r!.json()) as { error: string; code: string };
    expect(body.code).toBe("coming_soon");
    expect(body.error).toBe(ADS_COMING_SOON);
    expect(body.error).not.toMatch(/heygen|shotstack|fal\.ai|anthropic|claude/i);
  });

  it("moves the ad tools to the coming-soon group", async () => {
    const { STUDIO_TOOLS, SOON_TOOLS } = await import("@/components/tools");
    expect(STUDIO_TOOLS.map((t) => t.key)).toEqual(["translate", "presenter"]);
    expect(SOON_TOOLS.filter((t) => t.key === "ad" || t.key === "url").every((t) => t.soon)).toBe(true);
  });

  it("marks the ad pages as soon in the site menu and drops the ad-only solutions", async () => {
    const { menus } = await import("@/components/site/siteNav");
    const platform = menus.find((m) => m.key === "platform")!.columns[0].items;
    expect(platform.find((i) => i.href === "/platform/ads")?.soon).toBe(true);
    expect(platform.find((i) => i.href === "/platform/url-to-video")?.soon).toBe(true);
    expect(platform.find((i) => i.href === "/platform/translate")?.soon).toBeUndefined();
    const solutions = menus.find((m) => m.key === "solutions")!.columns.flatMap((c) => c.items.map((i) => i.href));
    expect(solutions).not.toContain("/solutions/shopify-stores");
    expect(solutions).toContain("/solutions/creators-and-localization");
  });

  it("keeps the FAQ and plan bullets translation-only", async () => {
    const { faq } = await import("@/content/faq");
    expect(faq.some((f) => f.q === "Can I use my own script?")).toBe(false);
    for (const f of faq) expect(f.a).not.toMatch(/\bad\b|\bads\b/i);
    const { PLANS } = await import("@/lib/plans");
    for (const p of PLANS) for (const b of p.bullets) expect(b).not.toMatch(/\bads?\b/i);
  });
});

describe("the active tool in the menu", () => {
  it("tells the presenter tool from the plain translation by the query", async () => {
    const { activeToolKey, STUDIO_TOOLS } = await import("@/components/tools");
    expect(activeToolKey("/new/translate", "", STUDIO_TOOLS)).toBe("translate");
    expect(activeToolKey("/new/translate", "speaker=presenter", STUDIO_TOOLS)).toBe("presenter");
    expect(activeToolKey("/dashboard", "", STUDIO_TOOLS)).toBeNull();
  });
});
