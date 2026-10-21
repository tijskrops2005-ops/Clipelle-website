import "server-only";
import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { config } from "@/lib/config";
import { db, rateLimits } from "@/lib/db";

/**
 * Rate limiter for public endpoints (sign-in, sign-up, magic link, password reset, demo requests).
 * Fixed window per key, counted in the database (table rate_limits), so the limit holds across
 * every server instance (Vercel runs many). Demo mode has no database and keeps a per-process map.
 */
export type RateLimitResult = { ok: boolean; count: number; limit: number; retryAfterSeconds: number; resetAt: Date };

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);
  const count = config.demoMode ? bumpMemory(key, resetAt.getTime()) : await bumpDatabase(key, windowStart, resetAt);
  const ok = count <= limit;
  return { ok, count, limit, retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000)), resetAt };
}

/** One atomic upsert: insert the window row or add one to it, and read the new count. */
async function bumpDatabase(key: string, windowStart: Date, expiresAt: Date) {
  const [row] = await db()
    .insert(rateLimits)
    .values({ key, windowStart, count: 1, expiresAt })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  // Housekeeping without a cron: the first hit of a new window sweeps windows that ended over a minute ago.
  if (row.count === 1) await db().delete(rateLimits).where(lt(rateLimits.expiresAt, new Date(Date.now() - 60_000)));
  return row.count;
}

function bumpMemory(key: string, resetAt: number) {
  const b = memory.get(key);
  if (!b || b.resetAt <= Date.now()) {
    memory.set(key, { count: 1, resetAt });
    return 1;
  }
  b.count += 1;
  return b.count;
}

/** Client address from the usual proxy headers; "unknown" when none. */
export function clientIp(request: Request) {
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return ip;
}

/** One-way hash so we never store a raw address (or e-mail) as a rate-limit key. */
export function hashIp(ip: string) {
  return createHash("sha256").update(`reelay:${ip}`).digest("hex").slice(0, 32);
}

export function tooManyRequests(retryAfterSeconds: number, what = "requests") {
  return Response.json({ error: `Too many ${what}. Try again in ${retryAfterSeconds} seconds.` }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}
