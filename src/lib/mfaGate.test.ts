import { describe, expect, it } from "vitest";
import { adminGate, mfaBlocksApi, mfaRedirectsPage, mfaVerifyNeeded } from "./mfaGate";

describe("two-step verification rules", () => {
  it("asks for the code only when a factor exists and the session has not used it", () => {
    expect(mfaVerifyNeeded("aal1", "aal2")).toBe(true);
    expect(mfaVerifyNeeded("aal2", "aal2")).toBe(false);
    expect(mfaVerifyNeeded("aal1", "aal1")).toBe(false);
    expect(mfaVerifyNeeded(null, undefined)).toBe(false);
  });

  it("redirects app pages but not the verify page or the API", () => {
    const prot = ["/dashboard", "/admin", "/settings"];
    expect(mfaRedirectsPage("/dashboard", prot)).toBe(true);
    expect(mfaRedirectsPage("/admin/customers", prot)).toBe(true);
    expect(mfaRedirectsPage("/verify-2fa", prot)).toBe(false);
    expect(mfaRedirectsPage("/pricing", prot)).toBe(false);
    expect(mfaRedirectsPage("/api/projects", prot)).toBe(false);
  });

  it("blocks app API calls until verified, except auth, the MFA routes, health and webhooks", () => {
    expect(mfaBlocksApi("/api/projects")).toBe(true);
    expect(mfaBlocksApi("/api/settings/profile")).toBe(true);
    expect(mfaBlocksApi("/api/settings/mfa/recover")).toBe(false);
    expect(mfaBlocksApi("/api/auth/signout")).toBe(false);
    expect(mfaBlocksApi("/api/health")).toBe(false);
    expect(mfaBlocksApi("/api/webhooks/heygen")).toBe(false);
    expect(mfaBlocksApi("/dashboard")).toBe(false);
  });

  it("gates the admin area: 404, demo, setup, verify, ok", () => {
    expect(adminGate({ demo: false, isAdmin: false, current: "aal2", next: "aal2" })).toBe("not_found");
    expect(adminGate({ demo: true, isAdmin: false, current: null, next: null })).toBe("demo");
    expect(adminGate({ demo: false, isAdmin: true, current: "aal1", next: "aal1" })).toBe("setup");
    expect(adminGate({ demo: false, isAdmin: true, current: "aal1", next: "aal2" })).toBe("verify");
    expect(adminGate({ demo: false, isAdmin: true, current: "aal2", next: "aal2" })).toBe("ok");
  });
});
