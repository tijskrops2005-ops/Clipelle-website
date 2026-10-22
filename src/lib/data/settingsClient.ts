"use client";

import { config } from "@/lib/config";

/**
 * Settings access for screens, with the demo switch like src/lib/data/client.ts: demo mode keeps
 * everything in localStorage under the demo user, database mode calls /api/settings/*.
 */
export type BrandDefaults = { accent?: string; captionStyle?: string; font?: string; logoPath?: string; /** Where the logo can be fetched (own route, or a data URL in demo mode). */ logoUrl?: string };
const BRAND_KEY = "clipelle.demo.brand";
const LOGO_KEY = "clipelle.demo.brandLogo";
const NAME_KEY = "clipelle.demo.name";
const WISH_KEY = "clipelle.demo.wishes";

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
  if (config.demoMode) {
    const logo = readLocal<string | null>(LOGO_KEY, null);
    return { ...readLocal<BrandDefaults>(BRAND_KEY, {}), logoPath: logo ? "demo" : undefined, logoUrl: logo ?? undefined };
  }
  return api<BrandDefaults>("/api/settings/brand");
}

export async function saveBrandDefaults(brand: Pick<BrandDefaults, "accent" | "captionStyle" | "font">) {
  if (config.demoMode) return writeLocal(BRAND_KEY, brand);
  await api("/api/settings/brand", { method: "PUT", body: JSON.stringify(brand) });
}

/** Uploads a logo (PNG, JPG or SVG, 2 MB) and returns where it can be shown; the old one is replaced. */
export async function uploadBrandLogo(file: File): Promise<{ logoUrl: string }> {
  if (config.demoMode) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Could not read the file."));
      r.readAsDataURL(file);
    });
    writeLocal(LOGO_KEY, dataUrl);
    return { logoUrl: dataUrl };
  }
  const form = new FormData();
  form.append("file", file, file.name);
  const r = await fetch("/api/settings/brand/logo", { method: "POST", body: form });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `Upload failed (${r.status}).`);
  return { logoUrl: body.logoUrl as string };
}

export async function removeBrandLogo() {
  if (config.demoMode) {
    try {
      window.localStorage.removeItem(LOGO_KEY);
    } catch {
      /* nothing stored */
    }
    return;
  }
  await api("/api/settings/brand/logo", { method: "DELETE" });
}

/** The saved logo as a File, so the ad form can start with it and still send exactly what a manual upload sends. */
export async function fetchBrandLogoFile(logoUrl: string): Promise<File | null> {
  try {
    const r = await fetch(logoUrl, { cache: "no-store" });
    if (!r.ok) return null;
    const blob = await r.blob();
    const ext = blob.type === "image/svg+xml" ? "svg" : blob.type === "image/png" ? "png" : "jpg";
    return new File([blob], `brand-logo.${ext}`, { type: blob.type || "application/octet-stream" });
  } catch {
    return null;
  }
}

export type ProfileInfo = { email: string; name: string; emailVerified: boolean; planKey: string; freeAdGrantedAt: string | null; notifyEmail: boolean };
const NOTIFY_EMAIL_KEY = "clipelle.demo.notifyEmail";

export async function getProfile(): Promise<ProfileInfo> {
  if (config.demoMode) return { email: "demo@clipelle.local", name: readLocal<string>(NAME_KEY, "Demo"), emailVerified: true, planKey: "free", freeAdGrantedAt: null, notifyEmail: readLocal<boolean>(NOTIFY_EMAIL_KEY, true) };
  return api<ProfileInfo>("/api/settings/profile");
}

/** E-mail when a video is ready or fails. */
export async function saveNotifyEmail(on: boolean) {
  if (config.demoMode) return writeLocal(NOTIFY_EMAIL_KEY, on);
  await api("/api/settings/profile", { method: "PATCH", body: JSON.stringify({ notifyEmail: on }) });
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

export type ApiKeyInfo = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

export async function listApiKeys(): Promise<{ keys: ApiKeyInfo[]; allowed: boolean }> {
  if (config.demoMode) return { keys: [], allowed: false };
  return api("/api/settings/api-keys");
}

/** Returns the full key once; it is never shown again. */
export async function createApiKey(name: string): Promise<{ id: string; key: string; prefix: string; name: string }> {
  if (config.demoMode) throw new Error("Demo mode has no accounts, so there are no API keys.");
  return api("/api/settings/api-keys", { method: "POST", body: JSON.stringify({ name }) });
}

export async function revokeApiKey(id: string) {
  if (config.demoMode) return;
  await api(`/api/settings/api-keys/${id}`, { method: "DELETE" });
}

export type TeamInfo = {
  workspace: { id: string; name: string; kind: string; planKey: string; ownerUserId: string };
  role: "owner" | "member";
  balance: number;
  members: { id: string; userId: string; role: string; createdAt: string; email: string; name: string | null; usedThisMonth: number; projectsThisMonth: number }[];
  invites: { id: string; email: string; role: string; expiresAt: string; createdAt: string }[];
};

export const listWorkspaces = () => api<{ current: string; workspaces: { id: string; name: string; kind: string; role: string }[] }>("/api/workspaces");
export const createWorkspace = (name: string) => api<{ id: string; name: string }>("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) });
export const switchWorkspace = async (workspaceId: string) => { await api("/api/workspaces/switch", { method: "POST", body: JSON.stringify({ workspaceId }) }); };
export const getTeam = (id: string) => api<TeamInfo>(`/api/workspaces/${id}`);
export const renameWorkspace = async (id: string, name: string) => { await api(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ action: "rename", name }) }); };
export const transferOwnership = async (id: string, toUserId: string) => { await api(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ action: "transfer", toUserId }) }); };
export const leaveWorkspace = async (id: string) => { await api(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ action: "leave" }) }); };
export const deleteWorkspace = async (id: string, confirmName: string) => { await api(`/api/workspaces/${id}`, { method: "DELETE", body: JSON.stringify({ confirmName }) }); };
export const removeMember = async (id: string, userId: string) => { await api(`/api/workspaces/${id}/members`, { method: "DELETE", body: JSON.stringify({ userId }) }); };
export const inviteToWorkspace = (id: string, email: string) => api<{ id: string; email: string; link: string; mailed: boolean }>(`/api/workspaces/${id}/invites`, { method: "POST", body: JSON.stringify({ email }) });
export const revokeInvite = async (id: string, inviteId: string) => { await api(`/api/workspaces/${id}/invites`, { method: "DELETE", body: JSON.stringify({ inviteId }) }); };

export type UsageInfo = { balance: number; projectsThisMonth: number; projects: { projectId: string; name: string; workflow: string; usd: number; calls: number; last: string }[]; ledger: { id: string; credits: number; kind: string; note: string | null; createdAt: string; expiresAt: string | null }[] };

export async function getUsage(): Promise<UsageInfo> {
  if (config.demoMode) return { balance: 120, projectsThisMonth: 4, projects: [], ledger: [{ id: "demo", credits: 120, kind: "grant_manual", note: "Demo credits (simulated)", createdAt: new Date().toISOString(), expiresAt: null }] };
  return api<UsageInfo>("/api/settings/usage");
}

/* ---------- outgoing webhooks (Settings → API keys → Webhooks) ---------- */

export type WebhookEndpointInfo = { id: string; url: string; events: string[]; active: boolean; createdAt: string; lastDeliveryAt: string | null; lastStatus: string | null };
export type WebhookDeliveryInfo = { id: string; endpointId: string; event: string; projectId: string | null; attempt: number; status: string; responseStatus: number | null; error: string | null; createdAt: string; deliveredAt: string | null };
export type WebhooksInfo = { endpoints: WebhookEndpointInfo[]; deliveries: WebhookDeliveryInfo[]; events: string[]; allowed: boolean; role: string };

export async function getWebhooks(): Promise<WebhooksInfo> {
  if (config.demoMode) return { endpoints: [], deliveries: [], events: ["project.completed", "project.failed"], allowed: false, role: "owner" };
  return api("/api/settings/webhooks");
}
export async function createWebhookEndpoint(url: string, events: string[]): Promise<{ id: string; url: string; events: string[]; secret: string }> {
  if (config.demoMode) throw new Error("Webhooks need the database and a paid plan; demo mode has neither.");
  return api("/api/settings/webhooks", { method: "POST", body: JSON.stringify({ url, events }) });
}
export async function deleteWebhookEndpoint(id: string) {
  await api(`/api/settings/webhooks/${id}`, { method: "DELETE" });
}
export async function retryWebhookDelivery(id: string) {
  await api(`/api/settings/webhooks/deliveries/${id}/retry`, { method: "POST" });
}
