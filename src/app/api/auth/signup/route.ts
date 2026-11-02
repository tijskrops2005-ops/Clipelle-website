import { z } from "zod";
import { cookies } from "next/headers";
import { TERMS_VERSION } from "@/lib/termsVersion";
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
  // Recorded with the account (2 Nov 2026): which terms were accepted and when, and the referral code of the first visit.
  const ref = (await cookies()).get("clipelle_ref")?.value;
  const accepted = { terms: TERMS_VERSION, termsAcceptedAt: new Date().toISOString(), ...(ref && /^[A-Za-z0-9_-]{2,64}$/.test(ref) ? { ref } : {}) };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl(request)}/auth/callback?next=/dashboard`, data: { ...(name ? { name } : {}), ...accepted } },
  });
  if (error) return Response.json({ error: friendly(error.message) }, { status: 400 });
  // With "confirm e-mail" on, there is no session yet; the page shows "check your inbox".
  return Response.json({ ok: true, needsVerification: !data.session });
}
