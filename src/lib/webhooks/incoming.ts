import "server-only";
import { createHash, createHmac, createPublicKey, timingSafeEqual, verify as cryptoVerify } from "node:crypto";
import { db, webhookEvents } from "@/lib/db";
import { inngest, providerJobFinished } from "@/lib/inngest/client";

/**
 * Incoming provider webhooks (Stage 8 step 8, built 2026-10-21). Every provider that documents a
 * webhook can wake a waiting job early; the orchestrators still poll as the fallback, so a lost or
 * unverifiable call never stops a video. Verified per the provider's docs (fetched 2026-10-21):
 * - HeyGen: header `signature` = hex HMAC-SHA256 of the raw body with the endpoint secret;
 *   dedupe on event_type + the video id.
 * - fal.ai: ED25519 over "<request-id>\n<user-id>\n<timestamp>\n<sha256(body) hex>" with keys from
 *   their JWKS; timestamp within 300 s.
 * - Shotstack: no signature; the render is re-read through the API before anything is trusted.
 * Events are stored once (unique provider + id + type); a replay is acknowledged and ignored.
 */
export type Provider = "heygen" | "fal" | "shotstack";

/** Where providers may call back: only with a public https base URL; otherwise jobs poll only. */
export function callbackBaseUrl(): string | null {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (!base || !/^https:\/\//i.test(base)) return null;
  return base;
}
export function callbackUrlFor(provider: Provider): string | undefined {
  const base = callbackBaseUrl();
  return base ? `${base}/api/webhooks/${provider}` : undefined;
}

export function verifyHeygenSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"));
}

export type FalJwk = { kty: string; crv?: string; x?: string; kid?: string };
export type FalHeaders = { requestId: string | null; userId: string | null; timestamp: string | null; signature: string | null };

export function verifyFalSignature(rawBody: Uint8Array | string, headers: FalHeaders, keys: FalJwk[], nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const { requestId, userId, timestamp, signature } = headers;
  if (!requestId || !userId || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) return false;
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const message = Buffer.from([requestId, userId, timestamp, bodyHash].join("\n"), "utf8");
  let sig: Buffer;
  try {
    sig = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (sig.length !== 64) return false;
  for (const jwk of keys) {
    if (jwk.kty !== "OKP" || !jwk.x) continue;
    try {
      const key = createPublicKey({ key: { kty: "OKP", crv: jwk.crv ?? "Ed25519", x: jwk.x }, format: "jwk" });
      if (cryptoVerify(null, message, key, sig)) return true;
    } catch {
      /* next key */
    }
  }
  return false;
}

let jwksCache: { keys: FalJwk[]; at: number } | null = null;
/** fal's public keys, cached for an hour (they say at most 24 h). */
export async function fetchFalJwks(): Promise<FalJwk[]> {
  if (jwksCache && Date.now() - jwksCache.at < 60 * 60_000) return jwksCache.keys;
  const res = await fetch("https://rest.fal.ai/.well-known/jwks.json", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`JWKS ${res.status}`);
  const body = (await res.json()) as { keys?: FalJwk[] };
  jwksCache = { keys: body.keys ?? [], at: Date.now() };
  return jwksCache.keys;
}

/** Stores the event once. Returns false for a replay (same provider, id and type). */
export async function recordProviderEvent(provider: Provider, externalId: string, eventType: string, payload: Record<string, unknown>): Promise<boolean> {
  const inserted = await db().insert(webhookEvents).values({ provider, externalId, eventType, payload, processedAt: new Date() }).onConflictDoNothing().returning({ id: webhookEvents.id });
  return inserted.length > 0;
}

/** Records the event and wakes the job that waits on it. The job verifies through the provider API before trusting anything. */
export async function acceptProviderEvent(provider: Provider, externalJobId: string, eventType: string, status: "completed" | "failed", payload: Record<string, unknown>) {
  const fresh = await recordProviderEvent(provider, externalJobId, eventType, payload);
  if (!fresh) return { duplicate: true };
  await inngest.send(providerJobFinished.create({ provider, externalJobId, status }));
  return { duplicate: false };
}
