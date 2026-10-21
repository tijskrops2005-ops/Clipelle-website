import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Uploads every file in public/examples/ to the public "examples" bucket of our own storage
 * (the marketing site plays them from there; the files are not in git). Run with
 * `npm run examples:upload` (reads .env.local). Idempotent: existing files are replaced.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.");
const BUCKET = "examples";
const TYPES = { ".mp4": "video/mp4", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

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
