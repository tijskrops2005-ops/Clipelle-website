import { describe, expect, it } from "vitest";
import { encodeViewCookie, parseViewCookie, viewAllowsRequest, viewExpiry, VIEW_MINUTES } from "./adminViewSession";

describe("view-as-customer cookie", () => {
  const id = "8d2d7a1e-6f4b-4c0b-9d7e-2a1b3c4d5e6f";
  it("round-trips and expires after thirty minutes", () => {
    const start = new Date("2026-11-02T10:00:00Z");
    const exp = viewExpiry(start);
    expect(exp.getTime() - start.getTime()).toBe(VIEW_MINUTES * 60_000);
    const value = encodeViewCookie(id, exp);
    expect(parseViewCookie(value, start.getTime())?.id).toBe(id);
    expect(parseViewCookie(value, exp.getTime() - 1)).not.toBeNull();
    expect(parseViewCookie(value, exp.getTime())).toBeNull();
    expect(parseViewCookie("garbage", start.getTime())).toBeNull();
    expect(parseViewCookie(`${id}.notanumber`, start.getTime())).toBeNull();
    expect(parseViewCookie(undefined)).toBeNull();
  });

  it("lets reads, leaving the view and signing out through; refuses writes and file downloads", () => {
    expect(viewAllowsRequest("GET", "/api/projects")).toBe(true);
    expect(viewAllowsRequest("GET", "/dashboard")).toBe(true);
    expect(viewAllowsRequest("POST", "/api/projects")).toBe(false);
    expect(viewAllowsRequest("PATCH", "/api/settings/profile")).toBe(false);
    expect(viewAllowsRequest("DELETE", "/api/settings/api-keys/1")).toBe(false);
    expect(viewAllowsRequest("PUT", "/api/billing/auto-reload")).toBe(false);
    expect(viewAllowsRequest("GET", "/api/projects/abc/download")).toBe(false);
    expect(viewAllowsRequest("POST", "/api/projects/zip")).toBe(false);
    expect(viewAllowsRequest("GET", "/api/settings/export")).toBe(false);
    expect(viewAllowsRequest("POST", "/api/admin/view/exit")).toBe(true);
    expect(viewAllowsRequest("POST", "/api/auth/signout")).toBe(true);
  });
});
