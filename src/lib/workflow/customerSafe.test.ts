import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

describe("customer-safe step messages (27 Oct 2026)", () => {
  it("removes provider names, status codes and API paths", async () => {
    const { customerSafe } = await import("./steps");
    const raw = "HeyGen error 409 (conflict): This workspace already has a glossary. Use GET /v3/brand-glossaries to find one, then PATCH /v3/brand-glossaries/{id} to update it.";
    const out = customerSafe(raw);
    expect(out).not.toMatch(/HeyGen|409|\/v3\//);
    expect(out).toMatch(/^the service: This workspace already has a glossary/);
  });
  it("leaves plain messages alone", async () => {
    const { customerSafe } = await import("./steps");
    expect(customerSafe("The video took longer than 30 minutes. Retry the step.")).toBe("The video took longer than 30 minutes. Retry the step.");
  });
});
