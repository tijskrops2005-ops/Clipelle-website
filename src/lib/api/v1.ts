import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { apiIdempotency, db, workspaces } from "@/lib/db";
import { config } from "@/lib/config";
import { AuthError } from "@/lib/auth";
import { DataError } from "@/lib/data/server";
import { CreditError } from "@/lib/credits";
import { CostGuardError } from "@/lib/services/costGuard";
import { rateLimit } from "@/lib/rateLimit";
import { findActiveKey, touchApiKey } from "@/lib/apiKeys";
import { UrlError } from "@/lib/safeUrl";
import type { AdProject, Project, TranslateProject } from "@/lib/types";

/**
 * Shared pieces of the public API v1: bearer-key authentication with a per-key rate limit in
 * the database, one error shape with stable codes, idempotency records and the project view
 * (generic step keys and labels, signed result URLs, never a provider name).
 */
export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiCaller = { userId: string; workspaceId: string; keyId: string; planKey: string };

/** Requests per key per minute; API_RATE_LIMIT_PER_MINUTE in .env.local overrides. */
export function apiRateLimitPerMinute() {
  const n = Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? "60");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60;
}

export async function authenticateApi(request: Request): Promise<ApiCaller> {
  if (config.demoMode) throw new ApiError("unavailable", "The API is not available while the server runs in demo mode.", 503);
  const header = request.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(\S+)$/i);
  if (!m) throw new ApiError("unauthorized", "Send your API key as `Authorization: Bearer rl_…`.", 401);
  const key = await findActiveKey(m[1]);
  if (!key) throw new ApiError("unauthorized", "This API key is unknown or revoked.", 401);
  const limited = await rateLimit(`api:key:${key.id}`, apiRateLimitPerMinute(), 60_000);
  if (!limited.ok) throw new ApiError("rate_limited", `Too many requests. Try again in ${limited.retryAfterSeconds} seconds.`, 429, { retryAfterSeconds: limited.retryAfterSeconds });
  if (!key.workspaceId) throw new ApiError("unauthorized", "This API key belongs to no workspace. Create a new key.", 401);
  const [w] = await db().select({ planKey: workspaces.planKey }).from(workspaces).where(eq(workspaces.id, key.workspaceId)).limit(1);
  const planKey = w?.planKey ?? "free";
  if (planKey === "free") throw new ApiError("plan_required", "The API needs a plan with credits. Pick a plan in Billing.", 403);
  await touchApiKey(key.id, key.lastUsedAt);
  return { userId: key.userId, workspaceId: key.workspaceId, keyId: key.id, planKey };
}

/** Every error becomes { error: { code, message, details? } } with a stable code. Never a provider name. */
export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message, details: error.details } }, error.status, error.code === "rate_limited" && error.details ? { "Retry-After": String((error.details as { retryAfterSeconds: number }).retryAfterSeconds) } : undefined);
  if (error instanceof z.ZodError) return json({ error: { code: "validation_error", message: error.issues[0]?.message ?? "Invalid input.", details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } }, 400);
  if (error instanceof AuthError) return json({ error: { code: "unauthorized", message: error.message } }, 401);
  if (error instanceof CreditError) return json({ error: { code: "insufficient_credits", message: error.message } }, 402);
  if (error instanceof CostGuardError) return json({ error: { code: "budget_exceeded", message: error.message } }, 409);
  if (error instanceof UrlError) return json({ error: { code: `file_${error.code}`, message: error.message } }, error.status);
  if (error instanceof DataError) {
    const code = error.code === "free_plan_limit" ? "plan_required" : error.code === "creative_budget" ? "budget_exceeded" : error.code === "user_limit" ? "rate_limited" : (error.code ?? "request_failed");
    return json({ error: { code, message: error.message } }, error.status);
  }
  console.error("[api/v1]", error);
  return json({ error: { code: "server_error", message: "Something went wrong on our side. Try again in a minute." } }, 500);
}

export function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...(headers ?? {}) } });
}

export function hashRequest(body: unknown) {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

/**
 * Same key + same Idempotency-Key + same body → the project made the first time. A different body
 * under the same key is refused, so a retry can never silently create a second video.
 */
export async function withIdempotency(keyId: string, idemKey: string | null, body: unknown, create: () => Promise<string>): Promise<{ projectId: string; replayed: boolean }> {
  if (!idemKey) return { projectId: await create(), replayed: false };
  if (idemKey.length > 200) throw new ApiError("validation_error", "Idempotency-Key is too long (200 characters max).", 400);
  const requestHash = hashRequest(body);
  const [existing] = await db().select().from(apiIdempotency).where(and(eq(apiIdempotency.keyId, keyId), eq(apiIdempotency.idemKey, idemKey))).limit(1);
  if (existing) {
    if (existing.requestHash !== requestHash) throw new ApiError("idempotency_mismatch", "This Idempotency-Key was already used with a different request body.", 409);
    if (!existing.projectId) throw new ApiError("conflict", "The earlier request with this Idempotency-Key did not produce a project. Use a new key.", 409);
    return { projectId: existing.projectId, replayed: true };
  }
  const [claimed] = await db().insert(apiIdempotency).values({ keyId, idemKey, requestHash }).onConflictDoNothing().returning({ id: apiIdempotency.id });
  if (!claimed) {
    // Lost the race against a concurrent identical request: hand back what it made.
    const [twin] = await db().select().from(apiIdempotency).where(and(eq(apiIdempotency.keyId, keyId), eq(apiIdempotency.idemKey, idemKey))).limit(1);
    if (twin?.projectId) return { projectId: twin.projectId, replayed: true };
    throw new ApiError("conflict", "A request with this Idempotency-Key is still in progress. Retry in a moment.", 409);
  }
  try {
    const projectId = await create();
    await db().update(apiIdempotency).set({ projectId }).where(eq(apiIdempotency.id, claimed.id));
    return { projectId, replayed: false };
  } catch (error) {
    await db().delete(apiIdempotency).where(eq(apiIdempotency.id, claimed.id));
    throw error;
  }
}

/* ---------- the project as the API shows it ---------- */

/** Signed result links are valid for about this long; fetch the project again for a fresh one. */
export const RESULT_URL_SECONDS = 3600;

export type ApiProject = {
  id: string;
  kind: "ad" | "translation";
  name: string;
  status: "draft" | "processing" | "needs_input" | "completed" | "failed";
  createdAt: string;
  steps: { key: string; label: string; status: string; error?: string }[];
  result: { videoUrl?: string; expiresInSeconds?: number };
  translations?: { language: string; status: string; videoUrl?: string; error?: string }[];
  ad?: { seconds?: number; quality?: "standard" | "premium"; language?: string };
};

export function toApiProject(p: Project): ApiProject {
  const stepKeys = Object.keys(p.steps) as (keyof typeof p.steps)[];
  const steps = stepKeys.map((k) => {
    const s = (p.steps as Record<string, { status: string; error?: string }>)[k];
    return { key: k, label: (config.stepLabels as Record<string, string>)[k] ?? k, status: s.status, error: s.error };
  });
  const status = p.status === "review" ? "needs_input" : p.status;
  const base = { id: p.id, name: p.name, status, createdAt: p.createdAt, steps } as const;
  if (p.workflow === "ad") {
    const a = p as AdProject;
    return { ...base, kind: "ad", result: { videoUrl: a.finalVideoUrl, expiresInSeconds: a.finalVideoUrl ? RESULT_URL_SECONDS : undefined }, ad: { seconds: a.seconds, quality: a.engine === "avatar_iv" ? "premium" : "standard", language: a.language } };
  }
  const t = p as TranslateProject;
  return { ...base, kind: "translation", result: {}, translations: t.translations.map((x) => ({ language: x.language, status: x.status, videoUrl: x.videoUrl, error: x.error })) };
}
