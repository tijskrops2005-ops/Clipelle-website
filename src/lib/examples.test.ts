import { afterEach, describe, expect, it } from "vitest";

/** The example resolver: bucket URL first, then the local folder, otherwise nothing (a placeholder). */
const saved = { base: process.env.NEXT_PUBLIC_EXAMPLES_BASE_URL, supabase: process.env.NEXT_PUBLIC_SUPABASE_URL };

describe("example videos", () => {
  afterEach(() => {
    if (saved.base === undefined) delete process.env.NEXT_PUBLIC_EXAMPLES_BASE_URL;
    else process.env.NEXT_PUBLIC_EXAMPLES_BASE_URL = saved.base;
    if (saved.supabase === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = saved.supabase;
  });

  it("uses an explicit base URL first", async () => {
    process.env.NEXT_PUBLIC_EXAMPLES_BASE_URL = "https://cdn.example.test/examples/";
    const { resolvedExamples } = await import("./examples");
    const list = resolvedExamples();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].src).toBe(`https://cdn.example.test/examples/${encodeURIComponent(list[0].file)}`);
  });

  it("derives the public bucket from the storage URL", async () => {
    delete process.env.NEXT_PUBLIC_EXAMPLES_BASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    const { resolvedExamples } = await import("./examples");
    expect(resolvedExamples("translate")[0]?.src).toMatch(/^https:\/\/abc\.supabase\.co\/storage\/v1\/object\/public\/examples\//);
  });

  it("falls back to the local folder or to nothing, never to a broken link", async () => {
    delete process.env.NEXT_PUBLIC_EXAMPLES_BASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { existsSync } = await import("node:fs");
    const { resolvedExamples } = await import("./examples");
    const { examples } = await import("@/content/examples");
    for (const e of resolvedExamples()) {
      expect(e.src.startsWith("/examples/")).toBe(true);
      expect(existsSync(`public${e.src}`)).toBe(true);
    }
    const missing = examples.filter((e) => !existsSync(`public/examples/${e.file}`));
    expect(resolvedExamples().length).toBe(examples.length - missing.length);
  });
});
