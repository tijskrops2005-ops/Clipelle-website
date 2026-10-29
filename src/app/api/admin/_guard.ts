import { isAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";

/** Admin API routes: only addresses in ADMIN_EMAILS; everyone else gets a bare 404 (the proxy does too). */
export async function adminOnly(): Promise<Response | null> {
  const user = config.demoMode ? null : await getUser();
  return user && isAdmin(user.email) ? null : new Response(null, { status: 404 });
}

export function adminError(error: unknown) {
  const e = error as { message?: string };
  return Response.json({ error: e?.message ?? "Unexpected error." }, { status: 500 });
}
