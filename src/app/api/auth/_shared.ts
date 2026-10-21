import { z } from "zod";
import { config } from "@/lib/config";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

export const Email = z.string().trim().email().max(200);
export const Password = z.string().min(8, "Use at least 8 characters.").max(200);

/** Demo mode has no accounts: every auth route says so. */
export function demoBlocked() {
  if (config.demoMode) return Response.json({ error: "Demo mode is on; accounts are disabled. Set NEXT_PUBLIC_DEMO_MODE=false to use sign-in." }, { status: 404 });
  return null;
}

/** 10 attempts per address per 10 minutes for every auth action. */
export function authRateLimit(request: Request, action: string) {
  const r = rateLimit(`auth:${action}:${clientIp(request)}`, 10, 10 * 60 * 1000);
  return r.ok ? null : tooManyRequests(r.retryAfterSeconds, "attempts");
}

export function siteUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

/** Plain-language auth errors; never the raw provider message for credential errors. */
export function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That e-mail and password do not match.";
  if (m.includes("email not confirmed")) return "Verify your e-mail first: open the link we sent you.";
  if (m.includes("already registered") || m.includes("already been registered")) return "There is already an account with this e-mail. Sign in instead.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Try again in a few minutes.";
  if (m.includes("password")) return message;
  return "Something went wrong. Try again.";
}
