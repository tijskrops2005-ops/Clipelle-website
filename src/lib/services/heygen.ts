import "server-only";

/**
 * HeyGen v3 client — server-only. Never import from a client component.
 *
 * Verified against developers.heygen.com on 2026-10-18. v3 only: v1/v2 are
 * sunset on 2026-10-31. The API key is read from the environment at call time
 * and never appears in errors, logs or responses.
 */

const BASE_URL = "https://api.heygen.com";

export type HeygenEngine = "avatar_iii" | "avatar_iv";

export type AvatarLook = {
  id: string;
  name: string;
  group_id?: string;
  avatar_type?: string;
  gender?: string;
  preview_image_url?: string;
  preview_video_url?: string;
  supported_api_engines?: string[];
  default_voice_id?: string;
};

export type Voice = {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_audio_url?: string;
  available_engines?: string[];
};

export type VideoStatus = "pending" | "processing" | "completed" | "failed";

export type Video = {
  video_id?: string;
  id?: string;
  status: VideoStatus;
  video_url?: string | null;
  thumbnail_url?: string | null;
  captioned_video_url?: string | null;
  subtitle_url?: string | null;
  duration?: number | null;
  failure_code?: string | null;
  failure_message?: string | null;
  created_at?: number;
};

export type Account = {
  billing_type?: "wallet" | "subscription" | "usage_based";
  wallet?: { currency?: "usd" | "credits"; remaining_balance?: number | null } | null;
  subscription?: {
    plan?: string;
    credits?: { premium_credits?: { remaining?: number | null }; add_on_credits?: { remaining?: number | null } };
  } | null;
  usage_based?: { spending_current_usd?: number | null; spending_cap_usd?: number | null } | null;
};

/** Thrown for any non-2xx answer. `message` is safe to show to the user. */
export class HeygenError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "HeygenError";
  }
}

/* ---------- cost guardrails shared by UI and server ---------- */

/** ~25 words ≈ 10 seconds of speech. Keeps every test video short and cheap. */
export const MAX_TEST_SCRIPT_CHARS = 160;

/** Rough seconds of speech for a script (about 2.5 words per second). */
export function estimateSeconds(script: string) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 2.5));
}

/**
 * Indicative USD per second, from HeyGen's published enterprise rates
 * (1 credit = $0.50; Avatar IV 0.1 credit/s; Avatar III 0.0167 credit/s).
 * Self-serve rates may differ; the real cost is measured from the wallet balance.
 */
export const RATE_USD_PER_SECOND: Record<HeygenEngine, number> = {
  avatar_iv: 0.05,
  avatar_iii: 0.0083,
};

export function estimateCostUsd(engine: HeygenEngine, seconds: number) {
  return Math.round(RATE_USD_PER_SECOND[engine] * seconds * 1000) / 1000;
}

/* ---------- transport ---------- */

function requireApiKey() {
  const key = process.env.HEYGEN_API_KEY?.trim();
  if (!key) {
    throw new HeygenError(
      "HEYGEN_API_KEY is not set. Add it to .env.local and restart the dev server.",
      500,
      "missing_api_key",
    );
  }
  return key;
}

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string } | string | null;
  message?: string;
  has_more?: boolean;
  next_token?: string | null;
};

/** JSON call to HeyGen v3; returns `data`. Shared by heygen.ts and translate.ts. */
export async function heygenFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await heygenFetchEnvelope<T>(path, init)).data as T;
}

/** Like heygenFetch but keeps the envelope, for list endpoints whose paging fields sit next to `data`. */
export async function heygenFetchEnvelope<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const key = requireApiKey();
  // A FormData body (asset upload) must set its own multipart boundary: no JSON content type then.
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": key,
      Accept: "application/json",
      ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = body?.error;
    const code = typeof err === "object" && err ? err.code : undefined;
    const detail =
      (typeof err === "object" && err?.message) || (typeof err === "string" ? err : undefined) || body?.message;
    const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
    throw new HeygenError(humanMessage(res.status, code, detail), res.status, code, retryAfter);
  }

  if (!body || body.data === undefined) {
    throw new HeygenError("HeyGen returned an empty response.", 502, "empty_response");
  }
  return body;
}

function humanMessage(status: number, code?: string, detail?: string) {
  if (status === 401) return "HeyGen rejected the API key. Check HEYGEN_API_KEY in .env.local.";
  if (status === 403) return `HeyGen refused this action for your account/plan${detail ? `: ${detail}` : "."}`;
  if (status === 402 || code === "insufficient_credit")
    return "Not enough HeyGen credits. Top up at platform.heygen.com and try again.";
  if (status === 429) return "HeyGen rate limit reached. Wait a moment and try again.";
  const base = `HeyGen error ${status}${code ? ` (${code})` : ""}`;
  return detail ? `${base}: ${detail}` : base;
}

/* ---------- read endpoints (free) ---------- */

type Page<T> = { items?: T[]; has_more?: boolean; next_token?: string | null } & Record<string, unknown>;

function itemsOf<T>(page: Page<T> | T[], key: string): T[] {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page.items)) return page.items;
  const alt = page[key];
  return Array.isArray(alt) ? (alt as T[]) : [];
}

export async function listLooks(params: { groupId?: string; limit?: number; token?: string } = {}) {
  const q = new URLSearchParams({ ownership: "public", limit: String(params.limit ?? 50) });
  if (params.groupId) q.set("group_id", params.groupId);
  if (params.token) q.set("token", params.token);
  const envelope = await heygenFetchEnvelope<Page<AvatarLook> | AvatarLook[]>(`/v3/avatars/looks?${q}`);
  const page = envelope.data as Page<AvatarLook> | AvatarLook[];
  const items = itemsOf(page, "looks");
  const paging = Array.isArray(page) ? envelope : { has_more: page.has_more ?? envelope.has_more, next_token: page.next_token ?? envelope.next_token };
  const nextToken = paging.has_more ? (paging.next_token ?? null) : null;
  return { items, nextToken };
}

/**
 * A varied selection for a picker: walks a few pages of public looks and keeps
 * at most `perCharacter` looks per avatar character (group). All calls are free.
 */
export async function listLookSelection({ pages = 4, perCharacter = 2 } = {}) {
  const perGroup = new Map<string, AvatarLook[]>();
  let token: string | undefined;
  for (let i = 0; i < pages; i++) {
    const { items, nextToken } = await listLooks({ limit: 50, token });
    for (const look of items) {
      const key = look.group_id ?? look.id;
      const bucket = perGroup.get(key) ?? [];
      if (bucket.length < perCharacter) {
        bucket.push(look);
        perGroup.set(key, bucket);
      }
    }
    if (!nextToken) break;
    token = nextToken;
  }
  return [...perGroup.values()].flat();
}

export async function listVoices(params: { language?: string; limit?: number } = {}) {
  const q = new URLSearchParams({ type: "public", limit: String(params.limit ?? 100) });
  if (params.language) q.set("language", params.language);
  const page = await heygenFetch<Page<Voice> | Voice[]>(`/v3/voices?${q}`);
  return itemsOf(page, "voices");
}

export async function getVideo(videoId: string) {
  return heygenFetch<Video>(`/v3/videos/${encodeURIComponent(videoId)}`);
}

export async function getAccount() {
  return heygenFetch<Account>("/v3/users/me");
}

/** Balance as a number plus its unit, or null when the account has no measurable balance. */
export function balanceOf(account: Account): { amount: number; unit: "usd" | "credits" } | null {
  if (account.billing_type === "wallet" && account.wallet?.remaining_balance != null) {
    return { amount: account.wallet.remaining_balance, unit: account.wallet.currency ?? "usd" };
  }
  const premium = account.subscription?.credits?.premium_credits?.remaining;
  const addOn = account.subscription?.credits?.add_on_credits?.remaining;
  if (premium != null || addOn != null) {
    return { amount: (premium ?? 0) + (addOn ?? 0), unit: "credits" };
  }
  return null;
}

/* ---------- the one endpoint that costs money ---------- */

export type CreateAvatarVideoInput = {
  avatarId: string; // a look id
  voiceId: string;
  script: string;
  engine: HeygenEngine;
  /** 720p for cheap tests, 1080p for customer videos (same price per second). */
  resolution?: "720p" | "1080p";
  title?: string;
  /** Stable key so a retried identical request is not created twice by HeyGen (24 h). */
  idempotencyKey?: string;
};

export async function createAvatarVideo(input: CreateAvatarVideoInput) {
  const data = await heygenFetch<{ video_id: string; status?: string }>("/v3/videos", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey ?? crypto.randomUUID() },
    body: JSON.stringify({
      type: "avatar",
      avatar_id: input.avatarId,
      voice_id: input.voiceId,
      script: input.script,
      aspect_ratio: "9:16",
      resolution: input.resolution ?? "720p",
      engine: { type: input.engine },
      title: input.title ?? "Reelay test",
    }),
  });
  return data;
}
