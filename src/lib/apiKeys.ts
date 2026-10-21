import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { apiKeys, db, workspaces } from "@/lib/db";
import { DataError } from "@/lib/data/server";

/**
 * API keys for the public API. A key is `rl_` + 43 url-safe characters, shown once; only its
 * SHA-256 hash is stored. A key belongs to a WORKSPACE (and records who made it); keys exist for
 * workspaces on a plan with credits (not the free plan).
 */
export const KEY_PREFIX = "rl_";
export const MAX_KEYS_PER_USER = 10;

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function looksLikeApiKey(value: string) {
  return /^rl_[A-Za-z0-9_-]{43}$/.test(value);
}

export async function planAllowsApiKeys(workspaceId: string) {
  const [w] = await db().select({ planKey: workspaces.planKey }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  return (w?.planKey ?? "free") !== "free";
}

export async function createApiKey(scope: { userId: string; workspaceId: string }, name: string) {
  if (!(await planAllowsApiKeys(scope.workspaceId))) throw new DataError("API keys are available on plans with credits. Pick a plan in Billing first.", 403, "plan_required");
  const existing = await db().select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.workspaceId, scope.workspaceId), isNull(apiKeys.revokedAt)));
  if (existing.length >= MAX_KEYS_PER_USER) throw new DataError(`A workspace can have ${MAX_KEYS_PER_USER} active keys. Revoke one first.`, 409, "too_many_keys");
  const key = KEY_PREFIX + randomBytes(32).toString("base64url");
  const prefix = key.slice(0, KEY_PREFIX.length + 8);
  const [row] = await db().insert(apiKeys).values({ userId: scope.userId, workspaceId: scope.workspaceId, name: name.trim().slice(0, 60) || "API key", prefix, keyHash: hashApiKey(key) }).returning({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt });
  return { ...row, key };
}

export async function listApiKeys(workspaceId: string) {
  return db()
    .select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, workspaceId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(workspaceId: string, id: string) {
  const [row] = await db().update(apiKeys).set({ revokedAt: new Date() }).where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspaceId), isNull(apiKeys.revokedAt))).returning({ id: apiKeys.id });
  if (!row) throw new DataError("Key not found.", 404, "not_found");
}

/** The active key row for a presented key, or null. */
export async function findActiveKey(key: string) {
  if (!looksLikeApiKey(key)) return null;
  const [row] = await db().select().from(apiKeys).where(and(eq(apiKeys.keyHash, hashApiKey(key)), isNull(apiKeys.revokedAt))).limit(1);
  return row ?? null;
}

/** "Last used" with at most one write per minute per key. */
export async function touchApiKey(id: string, lastUsedAt: Date | null) {
  if (lastUsedAt && Date.now() - lastUsedAt.getTime() < 60_000) return;
  await db().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}
