import { adminError, adminOnly, adminUser } from "@/app/api/admin/_guard";
import { startView } from "@/lib/adminView";
import { VIEW_COOKIE, VIEW_MINUTES } from "@/lib/adminViewSession";

/** Start viewing as this customer (2 Nov 2026): a 30-minute read-only session, recorded in the audit log. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = await adminOnly();
  if (blocked) return blocked;
  try {
    const admin = await adminUser();
    const { id } = await ctx.params;
    const view = await startView(admin, id, request);
    const res = Response.json({ ok: true, expiresAt: view.expiresAt.toISOString(), customerName: view.customerName });
    res.headers.append("Set-Cookie", `${VIEW_COOKIE}=${view.cookie}; Path=/; Max-Age=${VIEW_MINUTES * 60}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return res;
  } catch (error) {
    return error instanceof Error ? Response.json({ error: error.message }, { status: 400 }) : adminError(error);
  }
}
