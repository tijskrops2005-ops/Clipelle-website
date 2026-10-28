import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({}));
vi.mock("@/lib/storage", () => ({}));
vi.mock("@/lib/credits", () => ({}));
vi.mock("@/lib/inngest/client", () => ({ inngest: {}, providerJobFinished: {} }));

/** A full video service (429) makes a step wait its turn instead of failing the video (28 Oct 2026). */
describe("waiting for a free slot", () => {
  it("reads the wait from a 429, also when wrapped", async () => {
    const { busySeconds, ProviderBusy } = await import("./steps");
    expect(busySeconds({ status: 429, retryAfterSeconds: 90 })).toBe(90);
    expect(busySeconds({ status: 429 })).toBe(60);
    expect(busySeconds({ status: 429, retryAfterSeconds: 5 })).toBe(30);
    expect(busySeconds(new ProviderBusy("Starting", 120))).toBe(120);
    expect(busySeconds({ status: 500 })).toBeNull();
    expect(busySeconds(new Error("no"))).toBeNull();
  });

  it("turns a 429 after the quick retries into a busy signal, not a failure", async () => {
    const { withRetries, ProviderBusy } = await import("./steps");
    const full = Object.assign(new Error("HeyGen rate limit reached."), { status: 429, retryAfterSeconds: 45 });
    await expect(withRetries("Starting", async () => { throw full; }, 1)).rejects.toBeInstanceOf(ProviderBusy);
  });

  it("sleeps and starts the job again until the service has room", async () => {
    const { untilFree } = await import("./steps");
    const sleeps: string[] = [];
    const step = { sleep: async (id: string, d: string) => void sleeps.push(`${id}:${d}`) } as never;
    let calls = 0;
    const result = await untilFree<{ ok: true }>(step, "translate-submit", async () => (++calls < 3 ? { busy: 60 } : { ok: true }));
    expect(result).toEqual({ ok: true });
    expect(sleeps).toEqual(["translate-submit-busy-0:60s", "translate-submit-busy-1:60s"]);
  });

  it("gives up with a plain message after a long wait", async () => {
    const { untilFree } = await import("./steps");
    const step = { sleep: async () => undefined } as never;
    await expect(untilFree(step, "x", async () => ({ busy: 300 }), 10)).rejects.toThrow(/fully booked/);
  });
});
