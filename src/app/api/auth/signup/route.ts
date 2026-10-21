import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/ssr";
import { Email, Password, authRateLimit, demoBlocked, friendly, siteUrl } from "../_shared";

const Body = z.object({ email: Email, password: Password, name: z.string().trim().max(120).optional().or(z.literal("")) });

/** Creates an account; Supabase sends the verification e-mail (template set in the dashboard). */
export async function POST(request: Request) {
  const blocked = demoBlocked();
  if (blocked) return blocked;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check your e-mail and password." }, { status: 400 });
  const limited = await authRateLimit(request, "signup", parsed.data.email);
  if (limited) return limited;
  const { email, password, name } = parsed.data;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl(request)}/auth/callback?next=/dashboard`, data: name ? { name } : undefined },
  });
  if (error) return Response.json({ error: friendly(error.message) }, { status: 400 });
  // With "confirm e-mail" on, there is no session yet; the page shows "check your inbox".
  return Response.json({ ok: true, needsVerification: !data.session });
}
