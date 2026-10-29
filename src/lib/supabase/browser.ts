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

/**
 * Uploads a File straight from the browser to our storage, bypassing our server. The bucket name
 * comes with the signed URL. With `onProgress` (27 Oct 2026) the same request supabase-js makes
 * (PUT /storage/v1/object/upload/sign/<bucket>/<path>?token=…, multipart body with cacheControl and
 * the file, the publishable key as apikey) goes through XMLHttpRequest, the one browser API that
 * reports upload progress; without it the library call is used as before.
 */
export async function uploadToSignedUrl(bucket: string, path: string, token: string, file: File, onProgress?: (fraction: number) => void, directUrl?: string) {
  // R2 (29 Oct 2026): a presigned PUT of the raw file, with progress.
  if (directUrl) return putWithProgress(directUrl, file, { "Content-Type": file.type || "application/octet-stream" }, onProgress);
  if (!onProgress) {
    const { error } = await supabaseBrowser().storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
    if (error) throw new Error(error.message);
    return;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error("Storage is not configured (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).");
  const url = new URL(`${base.replace(/\/$/, "")}/storage/v1/object/upload/sign/${bucket}/${path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`);
  url.searchParams.set("token", token);
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  return putWithProgress(url.toString(), body, { apikey: key, Authorization: `Bearer ${key}`, "x-upsert": "false" }, onProgress);
}

/** One PUT through XMLHttpRequest, the one browser API that reports upload progress. */
function putWithProgress(url: string, body: XMLHttpRequestBodyInit, headers: Record<string, string>, onProgress?: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      let message = `Upload failed (${xhr.status}).`;
      try {
        const j = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = j.message ?? j.error ?? message;
      } catch {
        /* keep the status message */
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("The upload was cancelled."));
    xhr.send(body);
  });
}
