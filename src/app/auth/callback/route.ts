import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/ssr";

/**
 * Where Supabase sends the browser after a magic link, e-mail verification, password recovery or
 * an OAuth sign-in. Exchanges the code for a session cookie and continues to `next`.
 * Register this URL in the Supabase dashboard (docs/stage8-plan.md, deploy checklist).
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("The link is invalid or has expired. Request a new one.")}`, request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
