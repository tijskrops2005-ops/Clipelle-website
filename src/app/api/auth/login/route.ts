import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/ssr";
import { Email, authRateLimit, demoBlocked, friendly, safeNext } from "../_shared";

const Body = z.object({ email: Email, password: z.string().min(1).max(200), next: z.string().optional() });

/** E-mail + password sign-in; the session lands in cookies via the SSR client. */
export async function POST(request: Request) {
  const blocked = demoBlocked();
  if (blocked) return blocked;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your e-mail and password." }, { status: 400 });
  const limited = await authRateLimit(request, "login", parsed.data.email);
  if (limited) return limited;
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return Response.json({ error: friendly(error.message) }, { status: 400 });
  return Response.json({ ok: true, next: safeNext(parsed.data.next) });
}
