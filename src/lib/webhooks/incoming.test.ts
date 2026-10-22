import { createHash, createHmac, generateKeyPairSync, sign } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Incoming provider webhooks with simulated events: signature checks (pure), and the routes with
 * the job system stubbed so a verified event is recorded once and wakes the job exactly once.
 */
const sent: unknown[] = [];
vi.mock("@/lib/inngest/client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/inngest/client")>();
  return { ...mod, inngest: { ...mod.inngest, send: vi.fn(async (e: unknown) => (sent.push(e), { ids: [] })) } };
});
vi.mock("@/lib/services/finalEdit", () => ({ getRender: vi.fn(async (id: string) => ({ status: id.startsWith("done") ? "done" : id.startsWith("fail") ? "failed" : "rendering" })) }));

const hasDb = Boolean(process.env.DATABASE_URL);

describe("heygen signature", () => {
  it("accepts the hex HMAC of the raw body and refuses anything else", async () => {
    const { verifyHeygenSignature } = await import("./incoming");
    const body = '{"event_type":"avatar_video.success","event_data":{"video_id":"v1"}}';
    const good = createHmac("sha256", "s3cret").update(body).digest("hex");
    expect(verifyHeygenSignature(body, good, "s3cret")).toBe(true);
    expect(verifyHeygenSignature(body, good.toUpperCase(), "s3cret")).toBe(true);
    expect(verifyHeygenSignature(body + " ", good, "s3cret")).toBe(false);
    expect(verifyHeygenSignature(body, good, "other")).toBe(false);
    expect(verifyHeygenSignature(body, null, "s3cret")).toBe(false);
    expect(verifyHeygenSignature(body, "abc", "s3cret")).toBe(false);
  });
});

describe("fal signature", () => {
  it("verifies ED25519 over id, user, timestamp and the body hash, within 300 s", async () => {
    const { verifyFalSignature } = await import("./incoming");
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const jwk = publicKey.export({ format: "jwk" }) as { kty: string; crv: string; x: string };
    const body = Buffer.from('{"request_id":"r1","status":"OK"}');
    const now = 1_800_000_000;
    const headers = { requestId: "r1", userId: "u1", timestamp: String(now - 10), signature: "" };
    const message = Buffer.from(["r1", "u1", String(now - 10), createHash("sha256").update(body).digest("hex")].join("\n"));
    headers.signature = sign(null, message, privateKey).toString("hex");
    expect(verifyFalSignature(body, headers, [jwk], now)).toBe(true);
    expect(verifyFalSignature(body, headers, [{ kty: "OKP", crv: "Ed25519", x: (generateKeyPairSync("ed25519").publicKey.export({ format: "jwk" }) as { x: string }).x }], now)).toBe(false);
    expect(verifyFalSignature(Buffer.from("{}"), headers, [jwk], now)).toBe(false);
    expect(verifyFalSignature(body, { ...headers, timestamp: String(now - 400) }, [jwk], now)).toBe(false);
    expect(verifyFalSignature(body, { ...headers, signature: null }, [jwk], now)).toBe(false);
  });
});

describe.skipIf(!hasDb)("webhook routes with simulated events", () => {
  const secret = "test-heygen-secret";
  beforeAll(() => {
    process.env.HEYGEN_WEBHOOK_SECRET = secret;
  });
  afterAll(async () => {
    delete process.env.HEYGEN_WEBHOOK_SECRET;
    const { db, webhookEvents } = await import("@/lib/db");
    const { inArray } = await import("drizzle-orm");
    await db().delete(webhookEvents).where(inArray(webhookEvents.externalId, ["vid_test_1", "done-test-1", "rendering-test-1"]));
  });

  it("records a verified HeyGen event once and wakes the job once; a replay is ignored", async () => {
    const { POST } = await import("@/app/api/webhooks/heygen/route");
    const body = JSON.stringify({ event_type: "avatar_video.success", event_data: { video_id: "vid_test_1", url: "https://example.test/v.mp4" } });
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    const bad = await POST(new Request("https://clipelle.test/api/webhooks/heygen", { method: "POST", body, headers: { signature: "deadbeef" } }));
    expect(bad.status).toBe(401);
    const first = await POST(new Request("https://clipelle.test/api/webhooks/heygen", { method: "POST", body, headers: { signature: sig } }));
    expect(await first.json()).toMatchObject({ received: true, duplicate: false });
    const again = await POST(new Request("https://clipelle.test/api/webhooks/heygen", { method: "POST", body, headers: { signature: sig } }));
    expect(await again.json()).toMatchObject({ received: true, duplicate: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ name: "provider/job.finished", data: { provider: "heygen", externalJobId: "vid_test_1", status: "completed" } });
  });

  it("verifies a Shotstack callback through the API before waking anything", async () => {
    const { POST } = await import("@/app/api/webhooks/shotstack/route");
    const before = sent.length;
    const pending = await POST(new Request("https://clipelle.test/api/webhooks/shotstack", { method: "POST", body: JSON.stringify({ id: "rendering-test-1", status: "done" }) }));
    expect(await pending.json()).toMatchObject({ ignored: "rendering" });
    const done = await POST(new Request("https://clipelle.test/api/webhooks/shotstack", { method: "POST", body: JSON.stringify({ id: "done-test-1", status: "done" }) }));
    expect(await done.json()).toMatchObject({ received: true, duplicate: false });
    expect(sent.length).toBe(before + 1);
    expect(sent[before]).toMatchObject({ data: { provider: "shotstack", externalJobId: "done-test-1", status: "completed" } });
  });
});
