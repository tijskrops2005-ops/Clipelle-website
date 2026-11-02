import { isAdmin } from "@/lib/admin";
import { getUser, type AppUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { assuranceLevel } from "@/lib/mfa";
import { adminGate, MFA_REQUIRED_MESSAGE } from "@/lib/mfaGate";

/**
 * Admin API routes: only addresses in ADMIN_EMAILS, and (2 Nov 2026) only with two-step verification
 * used in this session; everyone else gets a bare 404 (the proxy does too), an admin without the
 * code a 403 with a plain message. Demo mode has no accounts and no admin API.
 */
export async function adminOnly(): Promise<Response | null> {
  const user = config.demoMode ? null : await getUser();
  if (!user || !isAdmin(user.email)) return new Response(null, { status: 404 });
  const aal = await assuranceLevel();
  if (adminGate({ demo: false, isAdmin: true, current: aal.current, next: aal.next }) !== "ok") return Response.json({ error: MFA_REQUIRED_MESSAGE, code: "mfa_required" }, { status: 403 });
  return null;
}

/** The admin behind a request that passed `adminOnly`. */
export async function adminUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}

export function adminError(error: unknown) {
  const e = error as { message?: string };
  return Response.json({ error: e?.message ?? "Unexpected error." }, { status: 500 });
}
