import "server-only";
import { createHash } from "node:crypto";

/**
 * Small in-memory rate limiter (per server instance) for public endpoints: demo requests,
 * sign-up and sign-in. Fixed window per key. Good enough for one instance; a shared store
 * (Redis or a table) can replace it behind the same function later.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  return { ok: true, retryAfterSeconds: 0 };
}

/** Client address from the usual proxy headers; "unknown" when none. */
export function clientIp(request: Request) {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return ip;
}

/** One-way hash so we never store a raw address. */
export function hashIp(ip: string) {
  return createHash("sha256").update(`reelay:${ip}`).digest("hex").slice(0, 32);
}

export function tooManyRequests(retryAfterSeconds: number, what = "requests") {
  return Response.json({ error: `Too many ${what}. Try again in ${retryAfterSeconds} seconds.` }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}
