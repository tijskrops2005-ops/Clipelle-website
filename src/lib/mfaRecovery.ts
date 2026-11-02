/**
 * Recovery codes for two-step verification (2 Nov 2026). The auth provider handles the TOTP factor;
 * recovery codes are ours: eight codes shown once, stored as SHA-256 hashes on the profile, each
 * usable once. Browser-safe pure functions over an array; the hashing uses Web Crypto.
 */
export type RecoveryCode = { hash: string; usedAt: string | null };

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/O, 1/l/i: easy to read back from paper
export const RECOVERY_CODE_COUNT = 8;

/** "k7m2-p9qx-4n8t": 12 characters in three groups. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT, random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = random(12);
    const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
    out.push(`${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`);
  }
  return out;
}

/** The form a code is compared in: lower case, no dashes or spaces. */
export function normalizeRecoveryCode(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeRecoveryCode(code));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashRecoveryCodes(codes: string[]): Promise<RecoveryCode[]> {
  return Promise.all(codes.map(async (c) => ({ hash: await hashRecoveryCode(c), usedAt: null })));
}

/** Marks the matching unused code as used; null when no unused code matches. */
export async function consumeRecoveryCode(stored: RecoveryCode[] | null | undefined, code: string, now = new Date()): Promise<RecoveryCode[] | null> {
  if (!stored?.length || normalizeRecoveryCode(code).length < 8) return null;
  const hash = await hashRecoveryCode(code);
  const index = stored.findIndex((c) => c.hash === hash && !c.usedAt);
  if (index < 0) return null;
  return stored.map((c, i) => (i === index ? { ...c, usedAt: now.toISOString() } : c));
}

export function recoveryCodesLeft(stored: RecoveryCode[] | null | undefined) {
  return (stored ?? []).filter((c) => !c.usedAt).length;
}
