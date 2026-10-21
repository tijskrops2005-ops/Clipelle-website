import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Our own file storage (Supabase Storage, one private bucket). Every provider returns
 * temporary URLs, so each result is copied here before the next step and before download.
 *
 * All access goes through this module, so the backend can move to Cloudflare R2 later
 * without touching the rest of the app.
 */

export const BUCKET = "reelay";
/** Free plan: 1 GB of storage. Shown on /dev/storage and in Settings. */
export const FREE_PLAN_BYTES = 1024 * 1024 * 1024;
/** Max object size we accept (free plan allows 50 MB per file). */
export const MAX_OBJECT_BYTES = 50 * 1024 * 1024;

export class StorageError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 500) {
    super(message);
    this.name = "StorageError";
  }
}

let bucketReady = false;

/** Creates the private bucket on first use (idempotent). */
export async function ensureBucket() {
  if (bucketReady) return;
  const s = supabaseAdmin().storage;
  const { data } = await s.getBucket(BUCKET);
  if (!data) {
    const { error } = await s.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_OBJECT_BYTES });
    if (error && !/already exists/i.test(error.message)) throw new StorageError(`Could not create the storage bucket: ${error.message}`, "bucket_create_failed");
  }
  bucketReady = true;
}

/** Only safe characters in object paths: our own ids and a sanitised file name. */
export function safeFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "file";
}

export function objectPath(parts: { projectId: string; kind: string; fileName: string; language?: string }) {
  const lang = parts.language ? `${parts.language}/` : "";
  return `projects/${parts.projectId}/${parts.kind}/${lang}${Date.now().toString(36)}-${safeFileName(parts.fileName)}`;
}

/**
 * Signed upload URL for the browser (valid 2 hours). The browser PUTs the file straight
 * to Supabase; our server never streams the bytes (Vercel's 4.5 MB request limit).
 */
export async function createSignedUpload(path: string) {
  await ensureBucket();
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new StorageError(`Could not create an upload URL: ${error?.message ?? "unknown"}`, "sign_failed");
  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

/** Signed download URL (default 1 hour). Used by the UI and handed to providers as a public input URL. */
/**
 * Signed URLs are cached per process (2026-10-20): every project poll used to mint a fresh URL,
 * so the <video src> changed every 3 s and the player reloaded mid-play. A URL is reused until
 * 10 minutes before it expires; the file itself never changes under the same path.
 */
const SIGNED_URL_REFRESH_MARGIN_MS = 10 * 60 * 1000;
const signedCache = (globalThis as unknown as { __reelaySignedUrls?: Map<string, { url: string; expiresAt: number }> }).__reelaySignedUrls ??= new Map();
(globalThis as unknown as { __reelaySignedUrls?: typeof signedCache }).__reelaySignedUrls = signedCache;

export async function signedDownloadUrl(path: string, expiresInSeconds = 3600, download?: string) {
  const key = `${path}|${expiresInSeconds}|${download ?? ""}`;
  const hit = signedCache.get(key);
  if (hit && hit.expiresAt - Date.now() > SIGNED_URL_REFRESH_MARGIN_MS) return hit.url;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(path, expiresInSeconds, download ? { download } : undefined);
  if (error || !data) throw new StorageError(`Could not sign a download URL: ${error?.message ?? "unknown"}`, "sign_failed");
  signedCache.set(key, { url: data.signedUrl, expiresAt: Date.now() + expiresInSeconds * 1000 });
  if (signedCache.size > 2000) signedCache.delete(signedCache.keys().next().value as string);
  return data.signedUrl;
}

export async function putObject(path: string, data: Uint8Array | Blob, contentType: string) {
  await ensureBucket();
  const body = data instanceof Blob ? data : new Blob([data as BlobPart], { type: contentType });
  if (body.size > MAX_OBJECT_BYTES) throw new StorageError(`File is ${(body.size / 1e6).toFixed(1)} MB; the limit is ${MAX_OBJECT_BYTES / 1e6} MB.`, "too_large", 413);
  const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw new StorageError(`Upload failed: ${error.message}`, "upload_failed");
  return { path, bytes: body.size, mime: contentType };
}

/**
 * Copies a provider result (temporary URL) into our storage. Streams through memory once;
 * results are tens of MB at most, well under a serverless function's limits.
 */
export async function copyFromUrl(url: string, path: string, fallbackMime = "application/octet-stream") {
  // A provider download that stalls must not hang a job step: give up after 3 minutes.
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new StorageError(`Could not download the provider file (${res.status}).`, "download_failed", 502);
  const mime = res.headers.get("content-type")?.split(";")[0] || fallbackMime;
  const blob = await res.blob();
  return putObject(path, new Blob([blob], { type: mime }), mime);
}

export async function deleteObject(path: string) {
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove([path]);
  if (error) throw new StorageError(`Delete failed: ${error.message}`, "delete_failed");
}

export async function objectInfo(path: string) {
  const folder = path.split("/").slice(0, -1).join("/");
  const name = path.split("/").pop() ?? path;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).list(folder, { search: name, limit: 1 });
  if (error) throw new StorageError(error.message, "list_failed");
  const hit = data?.find((o) => o.name === name);
  if (!hit) return null;
  const meta = (hit.metadata ?? {}) as { size?: number; mimetype?: string };
  return { path, bytes: meta.size ?? 0, mime: meta.mimetype ?? "application/octet-stream", updatedAt: hit.updated_at };
}

export type StorageUsage = {
  usedBytes: number;
  objectCount: number;
  freePlanBytes: number;
  /** 0–1 */
  fraction: number;
  byKind: { kind: string; bytes: number; count: number }[];
};

/**
 * Sum of every object in our bucket, read from Supabase's own storage.objects table
 * (size lives in metadata->>'size'). Supabase has no API for plan usage; the dashboard
 * under Reports stays the official source, this is our running estimate.
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  const rows = await db().execute<{ kind: string; bytes: string; count: string }>(sql`
    select coalesce(split_part(name, '/', 3), '(root)') as kind,
           coalesce(sum((metadata->>'size')::bigint), 0)::text as bytes,
           count(*)::text as count
    from storage.objects
    where bucket_id = ${BUCKET}
    group by 1
    order by 2 desc
  `);
  const byKind = rows.map((r) => ({ kind: r.kind, bytes: Number(r.bytes), count: Number(r.count) }));
  const usedBytes = byKind.reduce((n, k) => n + k.bytes, 0);
  const objectCount = byKind.reduce((n, k) => n + k.count, 0);
  return { usedBytes, objectCount, freePlanBytes: FREE_PLAN_BYTES, fraction: Math.min(1, usedBytes / FREE_PLAN_BYTES), byKind };
}

export function formatBytes(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

/** Reads one object back from storage (small files only, e.g. a brand logo served by our own route). */
export async function downloadObject(path: string): Promise<Blob | null> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
  if (error) {
    if (/not found|does not exist|404/i.test(error.message)) return null;
    throw new StorageError(`Download failed: ${error.message}`, "download_failed");
  }
  return data;
}
