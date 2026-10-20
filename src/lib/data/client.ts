"use client";

import { useEffect, useSyncExternalStore } from "react";
import { config } from "@/lib/config";
import type { AdProject, LanguageCode, PresenterPage, Project, StepKey, TranslateProject, TranslateStepKey, TranslationQuality } from "@/lib/types";
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
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (config.demoMode ? true : hydrated),
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
    const project: AdProject = {
      id: `prj_${Date.now().toString(36)}`,
      workflow: "ad",
      name: draft.name,
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
    ...rest,
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

export type TranslateProjectDraft = {
  name: string;
  video: File;
  sourceSeconds: number;
  sourceLanguage: LanguageCode | "auto";
  targetLanguages: LanguageCode[];
  quality: TranslationQuality;
  keepTerms?: string[];
  format: "original" | "9:16";
  enhance: boolean;
  rightsConfirmed: boolean;
};

export async function createTranslateProject(draft: TranslateProjectDraft): Promise<{ id: string }> {
  if (config.demoMode) {
    const now = new Date().toISOString();
    const project: TranslateProject = {
      id: `prj_${Date.now().toString(36)}`,
      workflow: "translate",
      name: draft.name,
      status: "processing",
      createdAt: now,
      sourceFileName: draft.video.name,
      sourceSeconds: Math.round(draft.sourceSeconds),
      // Demo: the browser's object URL only lives in this tab.
      sourceVideoUrl: URL.createObjectURL(draft.video),
      sourceLanguage: draft.sourceLanguage,
      targetLanguages: draft.targetLanguages,
      quality: draft.quality,
      rightsConfirmedAt: now,
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
  const { id } = await api<{ id: string }>("/api/projects", { method: "POST", body: JSON.stringify({ workflow: "translate", ...rest, sourceFileName: video.name }) });
  await uploadAndAttach(id, "source", video, draft.sourceSeconds);
  await startWithClearMessage(id);
  await refresh();
  return { id };
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
  const signed = await api<{ path: string; token: string }>("/api/uploads/sign", {
    method: "POST",
    body: JSON.stringify({ projectId, kind, fileName: file.name, bytes: file.size, mime: file.type }),
  });
  await uploadToSignedUrl(signed.path, signed.token, file);
  await api(`/api/projects/${projectId}/assets`, { method: "POST", body: JSON.stringify({ kind, storagePath: signed.path, fileName: file.name, seconds }) });
}

/** "Review script first": approve the generated script with a chosen hook and optional edits. */
export async function approveScript(projectId: string, review: { hookIndex: number; presenterScript?: string }) {
  if (config.demoMode) return mockRunner.approveScript(projectId, review);
  await api(`/api/projects/${projectId}/script`, { method: "POST", body: JSON.stringify(review) });
  await refresh();
}

export async function retryStep(projectId: string, key: StepKey | TranslateStepKey) {
  if (config.demoMode) {
    const adKeys: string[] = ["script", "productClip", "presenter", "finalEdit"];
    return adKeys.includes(key) ? mockRunner.retryStep(projectId, key as StepKey) : mockRunner.retryTranslateStep(projectId, key as TranslateStepKey);
  }
  await api(`/api/projects/${projectId}/retry`, { method: "POST", body: JSON.stringify({ stepKey: key }) });
  await refresh();
}

