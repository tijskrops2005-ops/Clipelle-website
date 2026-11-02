import "server-only";
import { config } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/ssr";

/**
 * Who is signed in, for server code. Demo mode has no accounts: every screen runs as the demo
 * user so the app keeps working without Supabase Auth. In database mode a missing session is
 * a 401 at the API and a redirect to /login on pages (src/proxy.ts).
 */
export type AppUser = { id: string; email: string; emailVerified: boolean; name?: string; /** From sign-up (2 Nov 2026): accepted terms version, when, and the referral code; copied to the profile once. */ termsVersion?: string; termsAcceptedAt?: string; referredBy?: string };

export const DEMO_USER: AppUser = { id: "00000000-0000-0000-0000-000000000001", email: "demo@clipelle.local", emailVerified: true, name: "Demo" };

export class AuthError extends Error {
  constructor(message = "Sign in to continue.", public readonly status = 401) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getUser(): Promise<AppUser | null> {
  if (config.demoMode) return DEMO_USER;
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u || !u.email) return null;
    const m = (u.user_metadata ?? {}) as Record<string, unknown>;
    const str = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : undefined);
    return { id: u.id, email: u.email, emailVerified: Boolean(u.email_confirmed_at), name: str("name"), termsVersion: str("terms"), termsAcceptedAt: str("termsAcceptedAt"), referredBy: str("ref") };
  } catch {
    return null;
  }
}

/** The demo workspace id: demo mode has no database, every screen runs in this one. */
export const DEMO_WORKSPACE_ID = "00000000-0000-0000-0000-00000000ffff";

/** An administrator looking at the app as a customer (2 Nov 2026): read-only, ends at `expiresAt`. */
export type Viewing = { id: string; adminUserId: string; adminEmail: string; customerName: string; customerId: string; expiresAt: string };

/** Who acts, and in which workspace with which role. Every data call takes this. */
export type Scope = { userId: string; user: AppUser; workspaceId: string; role: "owner" | "member"; workspaceName: string; planKey: string; workspaceKind: "personal" | "team"; /** Set while an administrator views as this customer: nothing may be changed. */ readOnly?: boolean; viewing?: Viewing };

export async function getScope(): Promise<Scope | null> {
  const user = await getUser();
  if (!user) return null;
  if (config.demoMode) return { userId: user.id, user, workspaceId: DEMO_WORKSPACE_ID, role: "owner", workspaceName: "Demo", planKey: "free", workspaceKind: "personal" };
  // "View as customer": a valid view session of this administrator turns the scope into the customer's, read-only.
  const { viewScopeFor } = await import("@/lib/adminView");
  const viewed = await viewScopeFor(user);
  if (viewed) return viewed;
  const { resolveScope } = await import("@/lib/workspaces");
  const { workspace, role } = await resolveScope(user);
  return { userId: user.id, user, workspaceId: workspace.id, role, workspaceName: workspace.name, planKey: workspace.planKey, workspaceKind: workspace.kind as "personal" | "team" };
}

export async function requireScope(): Promise<Scope> {
  const scope = await getScope();
  if (!scope) throw new AuthError();
  return scope;
}

/** For actions only the workspace owner may take (billing, members, keys for a team). */
export async function requireOwner(): Promise<Scope> {
  const scope = await requireScope();
  if (scope.role !== "owner") throw new AuthError("Only the workspace owner can do this.", 403);
  return scope;
}

/** For API routes: the signed-in user or a 401. */
export async function requireUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user) throw new AuthError();
  return user;
}

export function authErrorResponse(error: unknown): Response | null {
  if (error instanceof AuthError) return Response.json({ error: error.message, code: "unauthorized" }, { status: error.status });
  return null;
}

/** Paths that need a session. /new is public: it explains and offers sign-in when signed out. */
export const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/settings", "/new/ad", "/new/url", "/new/translate"];
