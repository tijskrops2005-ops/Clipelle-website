import "server-only";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/lib/db";
import { config } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/server";
import { consumeRecoveryCode, generateRecoveryCodes, hashRecoveryCodes, recoveryCodesLeft } from "@/lib/mfaRecovery";
import type { Aal } from "@/lib/mfaGate";

/**
 * Two-step verification on the server (2 Nov 2026). The auth provider owns the TOTP factor (enrol,
 * challenge, verify happen in the browser against it); here we read the assurance level of the
 * session, check the factor list with the service key, keep the mirror on the profile and manage
 * our own recovery codes (hashes only). A recovery code turns two-step verification off, so a lost
 * phone never locks anyone out; the customer enrols again afterwards.
 */
export async function assuranceLevel(): Promise<{ current: Aal; next: Aal }> {
  if (config.demoMode) return { current: "aal2", next: "aal2" };
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return { current: (data?.currentLevel as Aal) ?? null, next: (data?.nextLevel as Aal) ?? null };
  } catch {
    return { current: null, next: null };
  }
}

/** The provider's truth: does this account have a verified authenticator? */
export async function hasVerifiedTotp(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error("Could not read the verification settings. Try again in a moment.");
  return (data?.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");
}

export async function deleteAllFactors(userId: string) {
  const { data } = await supabaseAdmin().auth.admin.mfa.listFactors({ userId });
  for (const f of data?.factors ?? []) await supabaseAdmin().auth.admin.mfa.deleteFactor({ id: f.id, userId });
}

export async function mfaState(userId: string) {
  const [row] = await db().select({ totpEnabled: profiles.totpEnabled, recoveryCodes: profiles.recoveryCodes }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const enabled = await hasVerifiedTotp(userId);
  // The mirror follows the provider, so the customer list is right even after a change made elsewhere.
  if (row && row.totpEnabled !== enabled) await db().update(profiles).set({ totpEnabled: enabled, updatedAt: new Date() }).where(eq(profiles.userId, userId));
  return { enabled, recoveryLeft: enabled ? recoveryCodesLeft(row?.recoveryCodes) : 0 };
}

/** After the browser verified the new factor: record it and hand out fresh recovery codes (shown once). */
export async function enableMfaRecord(userId: string): Promise<string[]> {
  if (!(await hasVerifiedTotp(userId))) throw new Error("No verified authenticator found yet. Finish the code step first.");
  return newRecoveryCodes(userId);
}

export async function newRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await db().update(profiles).set({ totpEnabled: true, recoveryCodes: await hashRecoveryCodes(codes), updatedAt: new Date() }).where(eq(profiles.userId, userId));
  return codes;
}

export async function disableMfaRecord(userId: string) {
  await db().update(profiles).set({ totpEnabled: false, recoveryCodes: null, updatedAt: new Date() }).where(eq(profiles.userId, userId));
}

/** A recovery code removes every factor and the codes; false when the code is wrong or used. */
export async function recoverWithCode(userId: string, code: string): Promise<boolean> {
  const [row] = await db().select({ recoveryCodes: profiles.recoveryCodes }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const consumed = await consumeRecoveryCode(row?.recoveryCodes, code);
  if (!consumed) return false;
  await deleteAllFactors(userId);
  await disableMfaRecord(userId);
  return true;
}
