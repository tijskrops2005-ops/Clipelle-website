import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Developer-only: creates a test account with the e-mail already verified (the local bypass for
 * e-mail verification), so the sign-up → verify → sign-in path can be exercised without mail.
 * 404 outside development. Never deployed behaviour.
 */
const Body = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() });

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "email, password (8+) required" }, { status: 400 });
  const { data, error } = await supabaseAdmin().auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: true, user_metadata: parsed.data.name ? { name: parsed.data.name } : undefined });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ id: data.user?.id, email: data.user?.email });
}

export async function DELETE(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
