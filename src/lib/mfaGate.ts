/**
 * Two-step verification rules (2 Nov 2026), browser-safe and pure. The auth provider reports an
 * assurance level: `aal1` = signed in with a password or a link, `aal2` = also verified with the
 * authenticator app this session; `nextLevel` says what the account can reach (aal2 once a factor is
 * enrolled). Everyone who enrolled must verify before the app opens; administrators must have it.
 */
export type Aal = "aal1" | "aal2" | (string & {}) | null | undefined;

/** The account has an authenticator but this session has not used it yet. */
export function mfaVerifyNeeded(current: Aal, next: Aal) {
  return next === "aal2" && current !== "aal2";
}

/** Pages that need a session (the proxy's list), minus the verify page itself. */
export function mfaRedirectsPage(pathname: string, protectedPrefixes: string[]) {
  if (pathname === "/verify-2fa" || pathname.startsWith("/api/")) return false;
  return protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** API routes a half-signed-in session may still call: auth, the MFA routes themselves, health and provider webhooks. */
export function mfaBlocksApi(pathname: string) {
  if (!pathname.startsWith("/api/")) return false;
  const open = ["/api/auth/", "/api/settings/mfa", "/api/health", "/api/inngest", "/api/webhooks/", "/api/billing/webhook", "/api/v1/", "/api/demo-requests"];
  return !open.some((p) => pathname === p || pathname.startsWith(p));
}

export type AdminGate = "not_found" | "demo" | "setup" | "verify" | "ok";

/** What /admin shows: nothing for non-admins, mock data in demo mode, the setup or verify step, or the pages. */
export function adminGate(input: { demo: boolean; isAdmin: boolean; current: Aal; next: Aal }): AdminGate {
  if (input.demo) return "demo";
  if (!input.isAdmin) return "not_found";
  if (input.next !== "aal2") return "setup";
  if (input.current !== "aal2") return "verify";
  return "ok";
}

export const MFA_REQUIRED_MESSAGE = "Two-step verification is required. Verify with your authenticator app first.";
