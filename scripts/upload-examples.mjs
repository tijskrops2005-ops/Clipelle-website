import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Uploads every file in public/examples/ to the public examples bucket (Cloudflare R2 when configured, else Supabase Storage)
 * (the marketing site plays them from there; the files are not in git). Run with
 * `npm run examples:upload` (reads .env.local). Idempotent: existing files are replaced.
 */
const TYPES = { ".mp4": "video/mp4", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const dirR2 = path.join(process.cwd(), "public", "examples");

// Cloudflare R2 (29 Oct 2026): with R2 keys and R2_EXAMPLES_BUCKET the files go to that public bucket,
// served from NEXT_PUBLIC_EXAMPLES_BASE_URL (e.g. https://media.clipelle.com); no download costs.
const r2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_EXAMPLES_BUCKET;
if (r2) {
  const { AwsClient } = await import("aws4fetch");
  const aws = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  const files = (await readdir(dirR2)).filter((f) => TYPES[path.extname(f).toLowerCase()]);
  for (const f of files) {
    const bytes = await readFile(path.join(dirR2, f));
    const res = await aws.fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_EXAMPLES_BUCKET}/${encodeURIComponent(f)}`, { method: "PUT", body: bytes, headers: { "Content-Type": TYPES[path.extname(f).toLowerCase()], "Cache-Control": "public, max-age=31536000, immutable" } });
    console.log(res.ok ? `✓ ${f} (${(bytes.length / 1e6).toFixed(1)} MB)` : `✗ ${f}: HTTP ${res.status}`);
  }
  console.log(`Public base: ${process.env.NEXT_PUBLIC_EXAMPLES_BASE_URL ?? "set NEXT_PUBLIC_EXAMPLES_BASE_URL to the bucket's public address"}`);
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.");
const BUCKET = "examples";

const s = createClient(url, key, { auth: { persistSession: false } });
const { data: bucket } = await s.storage.getBucket(BUCKET);
if (!bucket) {
  const { error } = await s.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 50 * 1024 * 1024, allowedMimeTypes: Object.values(TYPES) });
  if (error) throw new Error(`Could not create the bucket: ${error.message}`);
  console.log(`Created public bucket "${BUCKET}".`);
}
const dir = path.join(process.cwd(), "public", "examples");
const files = (await readdir(dir)).filter((f) => TYPES[path.extname(f).toLowerCase()]);
for (const f of files) {
  const bytes = await readFile(path.join(dir, f));
  const { error } = await s.storage.from(BUCKET).upload(f, bytes, { contentType: TYPES[path.extname(f).toLowerCase()], upsert: true, cacheControl: "31536000" });
  console.log(error ? `✗ ${f}: ${error.message}` : `✓ ${f} (${(bytes.length / 1e6).toFixed(1)} MB)`);
}
console.log(`Public base: ${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}`);
