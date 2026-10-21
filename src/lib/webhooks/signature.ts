import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signature of outgoing webhooks (public API). Header `X-Reelay-Signature: t=<unix seconds>,v1=<hex>`
 * where v1 = HMAC-SHA256 over "<t>.<raw body>" with the endpoint secret. The timestamp blocks
 * replays; receivers should refuse anything older than 5 minutes. Pure, shared with the docs.
 */
export const SIGNATURE_HEADER = "X-Reelay-Signature";
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function signWebhook(secret: string, body: string, timestampSeconds = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac("sha256", secret).update(`${timestampSeconds}.${body}`).digest("hex");
  return `t=${timestampSeconds},v1=${v1}`;
}

export function verifyWebhookSignature(secret: string, body: string, header: string | null, nowSeconds = Math.floor(Date.now() / 1000), tolerance = SIGNATURE_TOLERANCE_SECONDS): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1 || Math.abs(nowSeconds - t) > tolerance) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  if (v1.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(v1, "utf8"), Buffer.from(expected, "utf8"));
}
