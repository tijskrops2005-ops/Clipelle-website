import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/ssr";
import { Password, authRateLimit, demoBlocked, friendly } from "../_shared";

const Body = z.object({ password: Password });

/** Sets a new password for the signed-in user (after a recovery link, or from Settings). */
export async function POST(request: Request) {
  const blocked = demoBlocked() ?? authRateLimit(request, "password");
  if (blocked) return blocked;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Use at least 8 characters." }, { status: 400 });
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return Response.json({ error: friendly(error.message) }, { status: 400 });
  return Response.json({ ok: true });
}
