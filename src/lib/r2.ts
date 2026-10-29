import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 for our files (29 Oct 2026). Supabase Storage blocked the whole project after the
 * free download quota ran out: every video is fetched many times (providers, players, checks), and
 * R2 charges nothing for downloads. R2 speaks the S3 API; requests are signed with aws4fetch
 * (Cloudflare's recommendation), presigned URLs carry `X-Amz-Expires`. Keys are read at call time and
 * never logged. On when R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET are set.
 */

export class R2Error extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
    this.name = "R2Error";
  }
}

export function r2Enabled() {
  return Boolean(process.env.R2_ACCOUNT_ID?.trim() && process.env.R2_ACCESS_KEY_ID?.trim() && process.env.R2_SECRET_ACCESS_KEY?.trim() && process.env.R2_BUCKET?.trim());
}

let cached: { key: string; client: AwsClient } | null = null;
function client() {
  const id = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  if (!id || !secret) throw new R2Error("R2 is not configured.");
  if (cached?.key !== id) cached = { key: id, client: new AwsClient({ accessKeyId: id, secretAccessKey: secret, service: "s3", region: "auto" }) };
  return cached.client;
}

export function r2Bucket() {
  return process.env.R2_BUCKET?.trim() ?? "";
}

/** https://<account>.r2.cloudflarestorage.com/<bucket>/<path>, each path segment encoded. */
export function r2ObjectUrl(path: string, bucket = r2Bucket()) {
  const account = process.env.R2_ACCOUNT_ID?.trim();
  if (!account || !bucket) throw new R2Error("R2 is not configured.");
  const key = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

async function presign(method: "GET" | "PUT", path: string, expiresInSeconds: number, extra: Record<string, string> = {}) {
  const url = new URL(r2ObjectUrl(path));
  url.searchParams.set("X-Amz-Expires", String(Math.max(60, Math.min(604800, Math.round(expiresInSeconds)))));
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const signed = await client().sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}

/** A link the browser PUTs the raw file to (no form fields; any content type). */
export function r2PresignedPut(path: string, expiresInSeconds = 7200) {
  return presign("PUT", path, expiresInSeconds);
}

/** A temporary download link; with `download` the browser saves it under that name. */
export function r2PresignedGet(path: string, expiresInSeconds = 3600, download?: string) {
  const name = download?.replace(/["\\\r\n]/g, "") ?? "";
  return presign("GET", path, expiresInSeconds, download ? { "response-content-disposition": `attachment; filename="${name}"` } : {});
}

async function call(method: string, path: string, init: { body?: BodyInit; headers?: Record<string, string> } = {}, bucket?: string) {
  return client().fetch(r2ObjectUrl(path, bucket), { method, body: init.body, headers: init.headers, signal: AbortSignal.timeout(180_000) });
}

export async function r2Put(path: string, body: Blob, contentType: string) {
  const res = await call("PUT", path, { body, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new R2Error(`Upload failed (${res.status}).`, res.status);
}

/** Size, type and date of an object, or null when it does not exist. */
export async function r2Head(path: string): Promise<{ bytes: number; mime: string; updatedAt: string | null } | null> {
  const res = await call("HEAD", path);
  if (res.status === 404) return null;
  if (!res.ok) throw new R2Error(`Could not read the file (${res.status}).`, res.status);
  return { bytes: Number(res.headers.get("content-length") ?? 0), mime: res.headers.get("content-type") ?? "application/octet-stream", updatedAt: res.headers.get("last-modified") };
}

export async function r2Get(path: string): Promise<Blob | null> {
  const res = await call("GET", path);
  if (res.status === 404) return null;
  if (!res.ok) throw new R2Error(`Download failed (${res.status}).`, res.status);
  return res.blob();
}

/** Server-side copy inside the bucket (S3 CopyObject); nothing is downloaded. */
export async function r2Copy(from: string, to: string) {
  const source = `/${r2Bucket()}/${from.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
  const res = await call("PUT", to, { headers: { "x-amz-copy-source": source } });
  if (!res.ok) throw new R2Error(`Copy failed (${res.status}).`, res.status);
}

export async function r2Delete(path: string) {
  const res = await call("DELETE", path);
  if (!res.ok && res.status !== 404) throw new R2Error(`Delete failed (${res.status}).`, res.status);
}

/** Every object (path and size), via ListObjectsV2; capped at 20 pages of 1,000. */
export async function r2List(prefix = ""): Promise<{ key: string; bytes: number }[]> {
  const account = process.env.R2_ACCOUNT_ID?.trim();
  const out: { key: string; bytes: number }[] = [];
  let token: string | null = null;
  for (let page = 0; page < 20; page++) {
    const url = new URL(`https://${account}.r2.cloudflarestorage.com/${r2Bucket()}`);
    url.searchParams.set("list-type", "2");
    if (prefix) url.searchParams.set("prefix", prefix);
    if (token) url.searchParams.set("continuation-token", token);
    const res = await client().fetch(url.toString(), { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new R2Error(`Could not list the files (${res.status}).`, res.status);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = /<Key>([\s\S]*?)<\/Key>/.exec(m[1])?.[1] ?? "";
      const size = Number(/<Size>(\d+)<\/Size>/.exec(m[1])?.[1] ?? 0);
      out.push({ key: decodeXml(key), bytes: size });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? decodeXml(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "") || null : null;
    if (!token) break;
  }
  return out;
}

function decodeXml(s: string) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** Uploads one public example file to the examples bucket (scripts and the dev panel). */
export async function r2PutExample(name: string, body: Blob, contentType: string) {
  const bucket = process.env.R2_EXAMPLES_BUCKET?.trim();
  if (!bucket) throw new R2Error("R2_EXAMPLES_BUCKET is not set.");
  const res = await call("PUT", name, { body, headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" } }, bucket);
  if (!res.ok) throw new R2Error(`Upload failed (${res.status}).`, res.status);
}
