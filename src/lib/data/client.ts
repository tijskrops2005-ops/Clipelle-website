"use client";

import { useEffect, useSyncExternalStore } from "react";
import { config } from "@/lib/config";
import type { AdProject, LanguageCode, PresenterPage, Project, Segment, StepKey, TranslateProject, TranslateStepKey, TranslationQuality } from "@/lib/types";
import { mockPresenterPage } from "@/lib/mock/presenters";
import * as mockStore from "@/lib/mock/store";
import * as mockRunner from "@/lib/mock/runner";
import { demoAdToneRewrite, emptyTranslations } from "@/lib/mock/translations";
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

export type AdProjectDraft = { name: string; seconds: number; engine: "avatar_iii" | "avatar_iv"; lookId?: string; productName: string; productUrl?: string; description: string; script?: string; images: File[] };

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
  const { id } = await api<{ id: string }>("/api/projects", { method: "POST", body: JSON.stringify({ workflow: "ad", ...draft, images: undefined }) });
  for (const file of draft.images) await uploadAndAttach(id, "image", file);
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
  reviewBeforeRender: boolean;
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
        review: { status: "waiting" },
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
async function uploadAndAttach(projectId: string, kind: "image" | "source", file: File, seconds?: number) {
  const signed = await api<{ path: string; token: string }>("/api/uploads/sign", {
    method: "POST",
    body: JSON.stringify({ projectId, kind, fileName: file.name, bytes: file.size, mime: file.type }),
  });
  await uploadToSignedUrl(signed.path, signed.token, file);
  await api(`/api/projects/${projectId}/assets`, { method: "POST", body: JSON.stringify({ kind, storagePath: signed.path, fileName: file.name, seconds }) });
}

export async function saveReviewedSegments(projectId: string, language: LanguageCode, segments: Segment[]) {
  if (config.demoMode) return mockRunner.saveReviewedSegments(projectId, language, segments);
  await api(`/api/projects/${projectId}/review`, { method: "PUT", body: JSON.stringify({ language, segments }) });
}

export async function approveReview(projectId: string) {
  if (config.demoMode) return mockRunner.approveReview(projectId);
  await api(`/api/projects/${projectId}/approve`, { method: "POST" });
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

/** "Rewrite in ad tone" on the review screen. Demo: prepared variants; database: Claude via the server. */
export async function rewriteInAdTone(projectId: string, language: LanguageCode, segments: Segment[]): Promise<Segment[]> {
  if (config.demoMode) {
    await new Promise((r) => setTimeout(r, 900));
    return demoAdToneRewrite(segments, language);
  }
  const r = await api<{ segments: Segment[] }>(`/api/projects/${projectId}/rewrite`, { method: "POST", body: JSON.stringify({ language, segments }) });
  return r.segments;
}
