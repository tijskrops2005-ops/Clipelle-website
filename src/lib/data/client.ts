"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { CaptionStyleChoice } from "@/lib/captionOptions";
import type { PresenterTranslate } from "@/lib/presenterTranslate";
import { config } from "@/lib/config";
import type { AdProject, Batch, LanguageCode, PresenterPage, Project, StepKey, TranslateProject, TranslateStepKey, TranslationQuality } from "@/lib/types";
import { variantFields, variantLabel, type Variant } from "@/content/formats";
import { DIRECTION_MAX_CHARS } from "@/lib/adOptions";
import { batchStatusOf } from "@/lib/batchStatus";
import { mockPresenterPage } from "@/lib/mock/presenters";
import type { AdTone } from "@/lib/adOptions";
import { mockVoiceOptions } from "@/lib/mock/voices";
import type { AdLanguageCode, SpeedKey, VoiceOptions } from "@/lib/voiceOptions";
import type { UploadKind } from "@/lib/data/uploads";
import * as mockStore from "@/lib/mock/store";
import * as mockRunner from "@/lib/mock/runner";
import { emptyTranslations } from "@/lib/mock/translations";
import { fileToThumbnail } from "@/lib/mock/images";
import { uploadToSignedUrl } from "@/lib/supabase/browser";

/**
 * One data interface for every screen. Demo mode: the mock store and the simulated runner
 * (everything stays in the browser). Database mode: the API routes under /api/projects,
 * polled while something is processing, and real uploads with signed URLs.
 */

/* ---------- database mode: a small polling store ---------- */

let cache: Project[] = [];
let hydrated = false;
const listeners = new Set<() => void>();
let timer: number | null = null;
let inFlight: Promise<void> | null = null;

function emit() {
  for (const l of listeners) l();
}

async function refresh() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const r = await fetch("/api/projects", { cache: "no-store" });
      if (r.ok) {
        cache = (await r.json()) as Project[];
        hydrated = true;
        emit();
      }
    } catch {
      /* keep the last good list */
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function schedule() {
  if (timer !== null) window.clearTimeout(timer);
  // Poll faster while a project is in progress or waiting for the user.
  const busy = cache.some((p) => p.status === "processing" || p.status === "review");
  timer = window.setTimeout(async () => {
    await refresh();
    if (listeners.size > 0) schedule();
  }, busy ? 3000 : 15000);
}

function subscribeApi(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refresh().then(schedule);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };
}

const emptyList: Project[] = [];
const getApiSnapshot = () => cache;
const getApiServerSnapshot = () => emptyList;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `Request failed (${r.status}).`);
  return body as T;
}

/* ---------- hooks ---------- */

export function useProjects(): Project[] {
  const mock = mockStore.useProjects();
  const live = useSyncExternalStore(subscribeApi, getApiSnapshot, getApiServerSnapshot);
  return config.demoMode ? mock : live;
}

export function useProject(id: string): Project | undefined {
  return useProjects().find((p) => p.id === id);
}

/** True once the client has its first real list (demo: after hydration from localStorage). */
export function useProjectsReady(): boolean {
  const ready = useSyncExternalStore(
    (cb) => {
      if (config.demoMode) return mockStore.subscribeToProjects(cb);
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (config.demoMode ? mockStore.isHydrated() : hydrated),
    () => false,
  );
  // Make sure the first fetch is triggered even when no list hook is mounted yet.
  useEffect(() => {
    if (!config.demoMode && !hydrated) void refresh();
  }, []);
  return ready;
}

/* ---------- actions ---------- */

/** Presenter looks for the picker: demo placeholders, or the cached catalogue behind /api/presenters. */
export async function listPresenters(params: { engine: "avatar_iii" | "avatar_iv"; gender?: "female" | "male"; page?: number }): Promise<PresenterPage> {
  if (config.demoMode) return mockPresenterPage(params);
  const q = new URLSearchParams({ engine: params.engine, page: String(params.page ?? 0) });
  if (params.gender) q.set("gender", params.gender);
  return api<PresenterPage>(`/api/presenters?${q}`);
}

/** Voices for the picker: demo placeholders, or the cached catalogue behind /api/voices. */
export async function listVoices(params: { language: AdLanguageCode; accent?: string; gender?: "female" | "male"; lookVoiceId?: string }): Promise<VoiceOptions> {
  if (config.demoMode) return mockVoiceOptions(params);
  const q = new URLSearchParams({ language: params.language });
  if (params.accent) q.set("accent", params.accent);
  if (params.gender) q.set("gender", params.gender);
  if (params.lookVoiceId) q.set("lookVoiceId", params.lookVoiceId);
  return api<VoiceOptions>(`/api/voices?${q}`);
}

export type AdProjectDraft = {
  /** "Make another version": the ad this one is a version of. */
  parentId?: string;
  /** Format from the library; the form already wrote its direction and tone into the fields. */
  format?: string;
  /** Hook style of a batch variation (set by createAdBatch, never by the form). */
  hook?: string;
  /** The batch a variation belongs to (set by createAdBatch). */
  batchId?: string;
  /** Demo only: staggers the ids of variations created in the same millisecond. */
  demoOffsetMs?: number;
  name: string;
  seconds: number;
  engine: "avatar_iii" | "avatar_iv";
  lookId?: string;
  language: AdLanguageCode;
  accent?: string;
  voiceId?: string;
  speed: SpeedKey;
  offer?: string;
  direction?: string;
  tone: AdTone;
  /** Presenter background: a hex colour, the customer's image, or nothing (the look's own). */
  background?: { type: "color"; value: string } | { type: "image"; file: File };
  brand?: { accent?: string; captionStyle?: string; font?: string; logo?: File };
  reviewScript: boolean;
  productName: string; productUrl?: string; description: string; script?: string; images: File[] };

export async function createAdProject(draft: AdProjectDraft): Promise<{ id: string }> {
  if (config.demoMode) {
    const imageUrls = await Promise.all(draft.images.map((f) => fileToThumbnail(f)));
    const now = new Date().toISOString();
    const lineage = demoVersionLineage(draft.parentId);
    const project: AdProject = {
      id: `prj_${(Date.now() + (draft.demoOffsetMs ?? 0)).toString(36)}`,
      workflow: "ad",
      name: draft.name,
      parentId: lineage.rootId,
      version: lineage.version,
      batchId: draft.batchId,
      hook: draft.hook,
      seconds: draft.seconds,
      engine: draft.engine,
      lookId: draft.lookId,
      language: draft.language,
      accent: draft.accent,
      voiceId: draft.voiceId,
      speed: draft.speed,
      offer: draft.offer,
      direction: draft.direction,
      tone: draft.tone,
      background: draft.background?.type === "image" ? { type: "image", url: URL.createObjectURL(draft.background.file) } : draft.background,
      brand: draft.brand ? { accent: draft.brand.accent, captionStyle: draft.brand.captionStyle, font: draft.brand.font, logoUrl: draft.brand.logo ? URL.createObjectURL(draft.brand.logo) : undefined } : undefined,
      reviewScript: draft.reviewScript,
      format: draft.format,
      productName: draft.productName,
      productUrl: draft.productUrl,
      description: draft.description,
      imageUrls,
      script: draft.script,
      status: "processing",
      steps: {
        script: { status: "processing", startedAt: now, attempt: 1 },
        productClip: { status: "waiting" },
        presenter: { status: "waiting" },
        finalEdit: { status: "waiting" },
      },
      createdAt: now,
    };
    mockStore.addProject(project);
    return { id: project.id };
  }
  const { background, brand, images, ...rest } = draft;
  const body = {
    workflow: "ad",
    ...withoutKeys(rest, ["batchId", "demoOffsetMs"]),
    backgroundColor: background?.type === "color" ? background.value : undefined,
    brand: brand ? { accent: brand.accent, captionStyle: brand.captionStyle, font: brand.font } : undefined,
  };
  const { id } = await api<{ id: string }>("/api/projects", { method: "POST", body: JSON.stringify(body) });
  for (const file of images) await uploadAndAttach(id, "image", file);
  if (background?.type === "image") await uploadAndAttach(id, "background", background.file);
  if (brand?.logo) await uploadAndAttach(id, "logo", brand.logo);
  await startWithClearMessage(id);
  await refresh();
  return { id };
}

/* ---------- "Make variations": 2–5 variants of one product, each its own project ---------- */

/** Demo: one mock project per variant plus a batch in the store. Database: /api/batches, uploads per project, one start. */
export async function createAdBatch(draft: AdProjectDraft, variants: Variant[]): Promise<{ id: string }> {
  if (config.demoMode) {
    const batchId = `bat_${Date.now().toString(36)}`;
    const ids: string[] = [];
    for (const [i, variant] of variants.entries()) {
      const fields = variantFields(variant, draft.direction ?? "", draft.tone, DIRECTION_MAX_CHARS);
      const { id } = await createAdProject({ ...draft, name: `${draft.name} · ${variantLabel(variant)}`, direction: fields.direction, tone: fields.tone, format: fields.format, hook: fields.hook, batchId, demoOffsetMs: i });
      ids.push(id);
    }
    mockStore.addBatch({ id: batchId, name: draft.name, status: "processing", createdAt: new Date().toISOString(), projectIds: ids });
    return { id: batchId };
  }
  const { background, brand, images, ...rest } = draft;
  const body = { workflow: "ad", ...withoutKeys(rest, ["format", "hook", "batchId", "demoOffsetMs"]), backgroundColor: background?.type === "color" ? background.value : undefined, brand: brand ? { accent: brand.accent, captionStyle: brand.captionStyle, font: brand.font } : undefined, variants };
  const { id, projectIds } = await api<{ id: string; projectIds: string[] }>("/api/batches", { method: "POST", body: JSON.stringify(body) });
  for (const projectId of projectIds) {
    for (const file of images) await uploadAndAttach(projectId, "image", file);
    if (background?.type === "image") await uploadAndAttach(projectId, "background", background.file);
    if (brand?.logo) await uploadAndAttach(projectId, "logo", brand.logo);
  }
  try {
    await api(`/api/batches/${id}/start`, { method: "POST" });
  } catch (error) {
    if (error instanceof TypeError) throw new Error("The app server could not be reached. Is `npm run dev` still running? Then try again.");
    throw error;
  }
  await refresh();
  return { id };
}

/** A batch with its live status, derived from the projects list (demo and database alike). */
export function useBatch(id: string): { batch: Batch | undefined; projects: AdProject[]; ready: boolean } {
  const all = useProjects();
  const ready = useProjectsReady();
  const demoBatches = mockStore.useBatches();
  const [remote, setRemote] = useState<Batch | null | undefined>(undefined);
  useEffect(() => {
    if (config.demoMode) return;
    let alive = true;
    api<{ batch: Batch }>(`/api/batches/${id}`).then((r) => alive && setRemote(r.batch)).catch(() => alive && setRemote(null));
    return () => {
      alive = false;
    };
  }, [id]);
  const members = all.filter((p): p is AdProject => p.workflow === "ad" && p.batchId === id);
  const meta = config.demoMode ? demoBatches.find((b) => b.id === id) : remote ?? undefined;
  if (!meta) return { batch: undefined, projects: members, ready: config.demoMode ? ready : remote !== undefined };
  return { batch: { ...meta, status: batchStatusOf(members.map((p) => p.status)), projectIds: members.length ? members.map((p) => p.id) : meta.projectIds }, projects: members, ready: true };
}

export type TranslateProjectDraft = {
  name: string;
  /** The uploaded video; absent for "Localize this ad", where `sourceProjectId` names the finished ad. */
  video?: File;
  sourceProjectId?: string;
  sourceSeconds: number;
  sourceLanguage: LanguageCode | "auto";
  targetLanguages: LanguageCode[];
  quality: TranslationQuality;
  keepTerms?: string[];
  trimSilence?: boolean;
  captionPosition?: "low" | "middle";
  /** Only sent when it differs from the original look (src/lib/captionOptions.ts). */
  captionStyle?: CaptionStyleChoice;
  removeMusic?: boolean;
  cleanVoice?: boolean;
  removeText?: boolean;
  captionCover?: boolean;
  speaker?: "original" | "presenter";
  presenter?: PresenterTranslate;
  format: "original" | "9:16";
  enhance: boolean;
  rightsConfirmed: boolean;
};

export async function createTranslateProject(draft: TranslateProjectDraft): Promise<{ id: string }> {
  if (config.demoMode) {
    const now = new Date().toISOString();
    const sourceAd = draft.sourceProjectId ? mockStore.getProjectsSnapshot().find((p): p is AdProject => p.workflow === "ad" && p.id === draft.sourceProjectId) : undefined;
    if (draft.sourceProjectId && !sourceAd?.finalVideoUrl) throw new Error("This ad has no finished video yet. Translate it once it is completed.");
    const project: TranslateProject = {
      id: `prj_${Date.now().toString(36)}`,
      workflow: "translate",
      name: draft.name,
      status: "processing",
      createdAt: now,
      sourceFileName: sourceAd ? `${sourceAd.name}.mp4` : (draft.video?.name ?? "video.mp4"),
      sourceSeconds: Math.round(draft.sourceSeconds),
      // Demo: the browser's object URL only lives in this tab; a localized ad reuses the ad's placeholder clip.
      sourceVideoUrl: sourceAd ? sourceAd.finalVideoUrl : draft.video ? URL.createObjectURL(draft.video) : undefined,
      sourceLanguage: draft.sourceLanguage,
      targetLanguages: draft.targetLanguages,
      quality: draft.quality,
      rightsConfirmedAt: now,
      rightsBasis: sourceAd ? "generated" : "own_upload",
      parentId: sourceAd?.id,
      steps: {
        upload: { status: "processing", startedAt: now, attempt: 1 },
        translate: { status: "waiting" },
        captions: { status: "waiting" },
      },
      translations: emptyTranslations(draft.targetLanguages),
    };
    mockStore.addProject(project);
    return { id: project.id };
  }
  const { video, ...rest } = draft;
  const { id } = await api<{ id: string }>("/api/projects", { method: "POST", body: JSON.stringify({ workflow: "translate", ...rest, sourceFileName: video?.name ?? "generated-ad.mp4" }) });
  if (video) await uploadAndAttach(id, "source", video, draft.sourceSeconds);
  await startWithClearMessage(id);
  await refresh();
  return { id };
}

/** Client-only keys never travel to the API. */
function withoutKeys<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as keyof T))) as Partial<T>;
}

/** Demo twin of the server's version numbering: point at the root and take the next number. */
function demoVersionLineage(parentId: string | undefined): { rootId?: string; version: number } {
  if (!parentId) return { version: 1 };
  const all = mockStore.getProjectsSnapshot();
  const parent = all.find((p) => p.id === parentId);
  if (!parent || parent.workflow !== "ad") return { version: 1 };
  const rootId = parent.parentId ?? parent.id;
  const top = Math.max(1, ...all.filter((p) => p.id === rootId || p.parentId === rootId).map((p) => p.version ?? 1));
  return { rootId, version: top + 1 };
}

/** Starts the project; a network failure (server restarting) gets a message a person can act on. */
async function startWithClearMessage(id: string) {
  try {
    await api(`/api/projects/${id}/start`, { method: "POST" });
  } catch (error) {
    if (error instanceof TypeError) throw new Error("The app server could not be reached. Is `npm run dev` still running? Then try again.");
    throw error;
  }
}

/** Browser → signed URL → storage, then tell the server which object belongs to the project. */
async function uploadAndAttach(projectId: string, kind: UploadKind, file: File, seconds?: number) {
  const signed = await api<{ path: string; token: string; bucket: string }>("/api/uploads/sign", {
    method: "POST",
    body: JSON.stringify({ projectId, kind, fileName: file.name, bytes: file.size, mime: file.type }),
  });
  await uploadToSignedUrl(signed.bucket, signed.path, signed.token, file);
  await api(`/api/projects/${projectId}/assets`, { method: "POST", body: JSON.stringify({ kind, storagePath: signed.path, fileName: file.name, seconds }) });
}

/** "Review script first": approve the generated script with a chosen hook and optional edits. */
export async function approveScript(projectId: string, review: { hookIndex: number; presenterScript?: string }) {
  if (config.demoMode) return mockRunner.approveScript(projectId, review);
  await api(`/api/projects/${projectId}/script`, { method: "POST", body: JSON.stringify(review) });
  await refresh();
}

/* ---------- organisation: rename, tags, archive, zip, share, onboarding ---------- */

export async function updateProjectMeta(projectId: string, patch: { name?: string; tags?: string[]; archived?: boolean }) {
  if (config.demoMode) {
    mockStore.updateProject(projectId, (p) => ({
      ...p,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.tags !== undefined ? { tags: [...new Set(patch.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10) } : {}),
      ...(patch.archived !== undefined ? { archivedAt: patch.archived ? new Date().toISOString() : undefined } : {}),
    }));
    return;
  }
  await api(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(patch) });
  await refresh();
}

/** Downloads the finished videos of the selected projects as one ZIP (database mode; demo has no real files). */
export async function downloadZip(ids: string[]) {
  if (config.demoMode) throw new Error("Demo mode has no real video files to zip. In database mode this downloads the finished videos in one file.");
  const r = await fetch("/api/projects/zip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Could not build the ZIP (${r.status}).`);
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = r.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "clipelle-videos.zip";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type ShareLinkInfo = { id: string; language: string | null; expiresAt: string; allowDownload: boolean; revokedAt: string | null; views: number; createdAt: string; active: boolean };
export async function listShareLinks(projectId: string): Promise<ShareLinkInfo[]> {
  if (config.demoMode) return [];
  return (await api<{ links: ShareLinkInfo[] }>(`/api/projects/${projectId}/share`)).links;
}
export async function createShareLink(projectId: string, input: { expiresInDays: number; allowDownload: boolean; language?: string }): Promise<{ id: string; url: string; expiresAt: string }> {
  if (config.demoMode) throw new Error("Viewing links need the database: a demo project has no real video to show.");
  return api(`/api/projects/${projectId}/share`, { method: "POST", body: JSON.stringify(input) });
}
export async function revokeShareLink(projectId: string, linkId: string) {
  await api(`/api/projects/${projectId}/share/${linkId}`, { method: "DELETE" });
}

export type OnboardingState = { firstAd: boolean; brand: boolean; translation: boolean; team: boolean; apiKey: boolean };
export async function getOnboarding(): Promise<OnboardingState> {
  if (config.demoMode) {
    const all = mockStore.getProjectsSnapshot();
    let brand = false;
    try {
      brand = Boolean(window.localStorage.getItem("clipelle.demo.brand"));
    } catch {
      /* ignore */
    }
    return { firstAd: all.some((p) => p.workflow === "ad" && !p.id.startsWith("prj_0")), brand, translation: all.some((p) => p.workflow === "translate" && !p.id.startsWith("prj_0")), team: false, apiKey: false };
  }
  return api("/api/onboarding");
}

export async function retryStep(projectId: string, key: StepKey | TranslateStepKey) {
  if (config.demoMode) {
    const adKeys: string[] = ["script", "productClip", "presenter", "finalEdit"];
    return adKeys.includes(key) ? mockRunner.retryStep(projectId, key as StepKey) : mockRunner.retryTranslateStep(projectId, key as TranslateStepKey);
  }
  await api(`/api/projects/${projectId}/retry`, { method: "POST", body: JSON.stringify({ stepKey: key }) });
  await refresh();
}


/**
 * Where "Download" points (26 Oct 2026): our own route, which checks the project and makes the storage
 * send the file as an attachment, so the browser saves it instead of opening the storage address.
 * Demo mode keeps the direct (same-origin) file.
 */
export function downloadHref(projectId: string, directUrl: string, language?: string) {
  if (config.demoMode) return directUrl;
  return `/api/projects/${projectId}/download${language ? `?language=${encodeURIComponent(language)}` : ""}`;
}
