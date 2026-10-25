import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/ssr";
import { Email, authRateLimit, demoBlocked, safeNext } from "../_shared";

const Body = z.object({ email: Email, code: z.string().trim().regex(/^\d{6,10}$/, "Enter the code from the e-mail."), next: z.string().optional() });

/**
 * Signs in with the one-time code from the e-mail (sent by /api/auth/magic; the Supabase "Magic
 * Link" template shows {{ .Token }}). The session lands in cookies via the SSR client. Same rate
 * limits as every auth action, so codes cannot be guessed.
 */
export async function POST(request: Request) {
  const blocked = demoBlocked();
  if (blocked) return blocked;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter the code from the e-mail." }, { status: 400 });
  const limited = await authRateLimit(request, "code", parsed.data.email);
  if (limited) return limited;
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.code, type: "email" });
  if (error) {
    const m = error.message.toLowerCase();
    const text = m.includes("expired") || m.includes("invalid") ? "That code is not valid any more. Ask for a new one." : m.includes("rate") ? "Too many attempts. Try again in a few minutes." : "That code did not work. Check it, or ask for a new one.";
    return Response.json({ error: text }, { status: 400 });
  }
  return Response.json({ ok: true, next: safeNext(parsed.data.next) });
}
