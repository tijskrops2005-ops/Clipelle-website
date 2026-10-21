"use client";

import { config } from "@/lib/config";

/**
 * Settings access for screens, with the demo switch like src/lib/data/client.ts: demo mode keeps
 * everything in localStorage under the demo user, database mode calls /api/settings/*.
 */
export type BrandDefaults = { accent?: string; captionStyle?: string; font?: string; logoPath?: string };
const BRAND_KEY = "reelay.demo.brand";
const NAME_KEY = "reelay.demo.name";
const WISH_KEY = "reelay.demo.wishes";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `Request failed (${r.status}).`);
  return body as T;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: keep in memory for this page only */
  }
}

export async function getBrandDefaults(): Promise<BrandDefaults> {
  if (config.demoMode) return readLocal<BrandDefaults>(BRAND_KEY, {});
  return api<BrandDefaults>("/api/settings/brand");
}

export async function saveBrandDefaults(brand: BrandDefaults) {
  if (config.demoMode) return writeLocal(BRAND_KEY, brand);
  await api("/api/settings/brand", { method: "PUT", body: JSON.stringify(brand) });
}

export type ProfileInfo = { email: string; name: string; emailVerified: boolean; planKey: string; freeAdGrantedAt: string | null };

export async function getProfile(): Promise<ProfileInfo> {
  if (config.demoMode) return { email: "demo@reelay.local", name: readLocal<string>(NAME_KEY, "Demo"), emailVerified: true, planKey: "free", freeAdGrantedAt: null };
  return api<ProfileInfo>("/api/settings/profile");
}

export async function saveProfileName(name: string) {
  if (config.demoMode) return writeLocal(NAME_KEY, name);
  await api("/api/settings/profile", { method: "PATCH", body: JSON.stringify({ name }) });
}

export async function changePassword(password: string) {
  if (config.demoMode) throw new Error("Demo mode has no accounts, so there is no password to change.");
  await api("/api/auth/password", { method: "POST", body: JSON.stringify({ password }) });
}

export async function deleteAccount(confirmEmail: string) {
  if (config.demoMode) throw new Error("Demo mode has no accounts to delete.");
  await api("/api/settings/profile", { method: "DELETE", body: JSON.stringify({ confirmEmail }) });
}

export async function getNotifyWishes(): Promise<string[]> {
  if (config.demoMode) return readLocal<string[]>(WISH_KEY, []);
  return (await api<{ features: string[] }>("/api/settings/notify")).features;
}

export async function addNotifyWish(feature: string) {
  if (config.demoMode) {
    const cur = readLocal<string[]>(WISH_KEY, []);
    if (!cur.includes(feature)) writeLocal(WISH_KEY, [...cur, feature]);
    return;
  }
  await api("/api/settings/notify", { method: "POST", body: JSON.stringify({ feature }) });
}

export type UsageInfo = { balance: number; projectsThisMonth: number; projects: { projectId: string; name: string; workflow: string; usd: number; calls: number; last: string }[]; ledger: { id: string; credits: number; kind: string; note: string | null; createdAt: string; expiresAt: string | null }[] };

export async function getUsage(): Promise<UsageInfo> {
  if (config.demoMode) return { balance: 120, projectsThisMonth: 4, projects: [], ledger: [{ id: "demo", credits: 120, kind: "grant_manual", note: "Demo credits (simulated)", createdAt: new Date().toISOString(), expiresAt: null }] };
  return api<UsageInfo>("/api/settings/usage");
}
