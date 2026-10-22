"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for the browser, with the publishable key only. It can do exactly one
 * thing in this app: upload a file to a signed upload URL that the server created.
 * It cannot read or write any table (RLS on, grants revoked) or list storage.
 */
let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Storage is not configured (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

/** Uploads a File straight from the browser to our storage, bypassing our server. The bucket name comes with the signed URL. */
export async function uploadToSignedUrl(bucket: string, path: string, token: string, file: File) {
  const { error } = await supabaseBrowser().storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);
}
