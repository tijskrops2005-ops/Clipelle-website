import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/ssr";
import { Email, authRateLimit, demoBlocked, siteUrl } from "../_shared";

const Body = z.object({ email: Email });

/** Password reset mail; always answers ok so addresses cannot be probed. */
export async function POST(request: Request) {
  const blocked = demoBlocked() ?? authRateLimit(request, "forgot");
  if (blocked) return blocked;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid e-mail address." }, { status: 400 });
  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${siteUrl(request)}/auth/callback?next=/reset-password` });
  return Response.json({ ok: true });
}
