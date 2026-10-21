"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Browser Supabase client for Auth only (sessions live in cookies that the server reads). */
let client: SupabaseClient | null = null;
export function supabaseAuthBrowser(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Sign-in is not configured (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).");
    client = createBrowserClient(url, key);
  }
  return client;
}
