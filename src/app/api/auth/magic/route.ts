import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/ssr";
import { Email, authRateLimit, demoBlocked, friendly, safeNext, siteUrl } from "../_shared";

const Body = z.object({ email: Email, next: z.string().optional() });

/** Sends a magic link (also creates the account when it does not exist yet). */
export async function POST(request: Request) {
  const blocked = demoBlocked() ?? authRateLimit(request, "magic");
  if (blocked) return blocked;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid e-mail address." }, { status: 400 });
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data.email, options: { emailRedirectTo: `${siteUrl(request)}/auth/callback?next=${encodeURIComponent(safeNext(parsed.data.next))}` } });
  if (error) return Response.json({ error: friendly(error.message) }, { status: 400 });
  return Response.json({ ok: true });
}
