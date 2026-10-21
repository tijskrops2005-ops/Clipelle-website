import { describe, expect, it } from "vitest";
import { signWebhook, verifyWebhookSignature } from "./signature";

describe("outgoing webhook signature", () => {
  it("signs t.body and verifies within the tolerance only", () => {
    const body = '{"id":"d1","event":"project.completed"}';
    const header = signWebhook("whsec_test", body, 1_800_000_000);
    expect(header).toMatch(/^t=1800000000,v1=[a-f0-9]{64}$/);
    expect(verifyWebhookSignature("whsec_test", body, header, 1_800_000_100)).toBe(true);
    expect(verifyWebhookSignature("whsec_test", body + " ", header, 1_800_000_100)).toBe(false);
    expect(verifyWebhookSignature("whsec_other", body, header, 1_800_000_100)).toBe(false);
    expect(verifyWebhookSignature("whsec_test", body, header, 1_800_000_000 + 301)).toBe(false);
    expect(verifyWebhookSignature("whsec_test", body, null)).toBe(false);
    expect(verifyWebhookSignature("whsec_test", body, "t=abc,v1=zz")).toBe(false);
  });
});
