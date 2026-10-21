import "server-only";
import { config } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/ssr";

/**
 * Who is signed in, for server code. Demo mode has no accounts: every screen runs as the demo
 * user so the app keeps working without Supabase Auth. In database mode a missing session is
 * a 401 at the API and a redirect to /login on pages (src/proxy.ts).
 */
export type AppUser = { id: string; email: string; emailVerified: boolean; name?: string };

export const DEMO_USER: AppUser = { id: "00000000-0000-0000-0000-000000000001", email: "demo@reelay.local", emailVerified: true, name: "Demo" };

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
    return { id: u.id, email: u.email, emailVerified: Boolean(u.email_confirmed_at), name: typeof u.user_metadata?.name === "string" ? u.user_metadata.name : undefined };
  } catch {
    return null;
  }
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
export const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/settings", "/new/ad", "/new/translate"];
