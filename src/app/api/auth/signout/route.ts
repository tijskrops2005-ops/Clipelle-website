import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/ssr";
import { demoBlocked } from "../_shared";

export async function POST(request: Request) {
  const blocked = demoBlocked();
  if (blocked) return blocked;
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
