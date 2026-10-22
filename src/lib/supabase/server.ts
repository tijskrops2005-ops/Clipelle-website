import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase admin client (server-only). Uses the secret key, which bypasses row-level
 * security: never import this from a client component. Used for Storage operations
 * (signed URLs, uploads, listing). Database access goes through Drizzle (src/lib/db).
 */

export function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local.");
  return url;
}

export function publishableKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set in .env.local.");
  return key;
}

function secretKey() {
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set in .env.local.");
  return key;
}

const globalForSupabase = globalThis as unknown as { __clipelleSupabaseAdmin?: SupabaseClient };

export function supabaseAdmin(): SupabaseClient {
  if (!globalForSupabase.__clipelleSupabaseAdmin) {
    globalForSupabase.__clipelleSupabaseAdmin = createClient(supabaseUrl(), secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return globalForSupabase.__clipelleSupabaseAdmin;
}
