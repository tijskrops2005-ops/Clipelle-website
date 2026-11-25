"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { stageUpload } from "@/lib/data/client";
import { maxVideoSeconds, type EnhanceKind, type EnhanceTarget } from "@/lib/enhanceRules";
import { MEDIA_TOOLS, normaliseOptions, type MediaToolKey, type MediaToolOptions } from "@/lib/mediaTools";
import type { ClientEnhanceJob, EnhanceLimits } from "@/lib/data/enhance";

export type { ClientEnhanceJob, EnhanceLimits };
export type EnhanceJobView = ClientEnhanceJob & { demo?: boolean };

/**
 * The enhancer's data in the browser (25 Nov 2026): the job list (refreshed every few seconds while a
 * job runs) and starting a job (staged upload with progress, then the job). In demo mode nothing is
 * uploaded or charged: a job "finishes" after a few seconds with the original file, labelled as a demo.
 */
const DEMO_LIMITS: EnhanceLimits = {
  maxSeconds: { "1080p": maxVideoSeconds(1.5, "1080p"), "4k": maxVideoSeconds(1.5, "4k") },
  maxSecondsHighFps: { "1080p": maxVideoSeconds(1.5, "1080p", true), "4k": maxVideoSeconds(1.5, "4k", true) },
};
let demoJobs: EnhanceJobView[] = [];
const demoListeners = new Set<() => void>();
const emitDemo = () => demoListeners.forEach((l) => l());

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `Request failed (${r.status}).`);
  return body as T;
}

/** The enhancer's jobs, or with `tool` the jobs of one media tool. */
export function useEnhanceJobs(tool?: MediaToolKey) {
  const mine = (j: EnhanceJobView) => (tool ? j.kind === tool : j.kind === "video" || j.kind === "image");
  const [jobs, setJobs] = useState<EnhanceJobView[]>(config.demoMode ? demoJobs.filter(mine) : []);
  const [limits, setLimits] = useState<EnhanceLimits | null>(config.demoMode ? DEMO_LIMITS : null);
  const [ready, setReady] = useState(config.demoMode);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (config.demoMode) {
      setJobs(demoJobs.filter(mine));
      return;
    }
    try {
      const r = await api<{ jobs: ClientEnhanceJob[]; limits?: EnhanceLimits }>(tool ? `/api/tool-jobs?tool=${tool}` : "/api/enhance");
      setJobs(r.jobs);
      if (r.limits) setLimits(r.limits);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your files.");
    } finally {
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  useEffect(() => {
    if (config.demoMode) {
      const l = () => setJobs(demoJobs.filter(mine));
      demoListeners.add(l);
      return () => {
        demoListeners.delete(l);
      };
    }
    void Promise.resolve().then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  // While something runs, look again every four seconds.
  const running = jobs.some((j) => j.status === "queued" || j.status === "processing");
  useEffect(() => {
    if (config.demoMode || !running) return;
    timer.current = setTimeout(refresh, 4000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [running, jobs, refresh]);

  return { jobs, limits, ready, error, refresh };
}

/** A stored file used as the source of a new job (25 Nov 2026, tools linked together). */
export type ToolSource = { from: string; fileName: string; media: "video" | "image"; seconds: number | null; width: number | null; height: number | null; previewUrl: string };

/** Reads what `from` points at; null while loading or when it is gone. */
export function useToolSource(from: string | null) {
  const [source, setSource] = useState<ToolSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(async () => {
      if (!from) {
        if (alive) { setSource(null); setError(null); }
        return;
      }
      if (config.demoMode) {
        const job = demoJobs.find((j) => `job:${j.id}` === from && j.resultUrl);
        if (alive) {
          setSource(job ? { from, fileName: job.fileName, media: job.kind === "image" || job.kind === "remove-background" ? "image" : "video", seconds: job.seconds ?? null, width: job.width ?? null, height: job.height ?? null, previewUrl: job.resultUrl! } : null);
          setError(job ? null : "That file is not available in demo mode. Upload one instead.");
        }
        return;
      }
      try {
        const r = await api<Omit<ToolSource, "from">>(`/api/tool-source?from=${encodeURIComponent(from)}`);
        if (alive) { setSource({ from, ...r }); setError(null); }
      } catch (e) {
        if (alive) { setSource(null); setError(e instanceof Error ? e.message : "That file is not available any more."); }
      }
    });
    return () => {
      alive = false;
    };
  }, [from]);
  return { source, error };
}

/** A demo job that finishes after a few seconds with the same file. */
function demoJob(base: Omit<EnhanceJobView, "id" | "status" | "createdAt" | "demo">) {
  const id = `demo-${Date.now().toString(36)}`;
  demoJobs = [{ ...base, id, status: "processing", createdAt: new Date().toISOString(), demo: true }, ...demoJobs];
  emitDemo();
  setTimeout(() => {
    demoJobs = demoJobs.map((j) => (j.id === id ? { ...j, status: "completed", resultUrl: j.sourceUrl, finishedAt: new Date().toISOString() } : j));
    emitDemo();
  }, 5000);
  return id;
}

export async function startEnhance(input: { kind: EnhanceKind; target: EnhanceTarget; file?: File; source?: ToolSource; seconds?: number; width?: number; height?: number }, onProgress?: (fraction: number) => void): Promise<string> {
  if (config.demoMode && input.source) {
    onProgress?.(1);
    return demoJob({ kind: input.kind, target: input.target, fileName: input.source.fileName, sourceUrl: input.source.previewUrl, width: input.width, height: input.height, seconds: input.seconds });
  }
  if (input.source) {
    const r = await api<{ id: string }>("/api/enhance", { method: "POST", body: JSON.stringify({ kind: input.kind, target: input.target, from: input.source.from, seconds: input.seconds, rightsConfirmed: true }) });
    return r.id;
  }
  if (!input.file) throw new Error("Pick a file first.");
  if (config.demoMode) {
    const id = `demo-${Date.now().toString(36)}`;
    const url = URL.createObjectURL(input.file);
    const job: EnhanceJobView = { id, kind: input.kind, status: "processing", target: input.target, fileName: input.file.name, sourceUrl: url, width: input.width, height: input.height, seconds: input.seconds, createdAt: new Date().toISOString(), demo: true };
    demoJobs = [job, ...demoJobs];
    emitDemo();
    onProgress?.(1);
    setTimeout(() => {
      demoJobs = demoJobs.map((j) => (j.id === id ? { ...j, status: "completed", resultUrl: url, finishedAt: new Date().toISOString() } : j));
      emitDemo();
    }, 5000);
    return id;
  }
  const staged = await stageUpload(input.kind === "video" ? "source" : "image", input.file!, onProgress);
  if (!staged) throw new Error("The upload did not finish. Try again.");
  const r = await api<{ id: string }>("/api/enhance", {
    method: "POST",
    body: JSON.stringify({ kind: input.kind, target: input.target, stagedPath: staged.path, fileName: input.file!.name, mime: input.file!.type || undefined, seconds: input.seconds, rightsConfirmed: true }),
  });
  return r.id;
}

/** Starts a media tool job: staged upload with progress, then the job. Demo mode simulates it. */
export async function startToolJob(input: { tool: MediaToolKey; file?: File; source?: ToolSource; seconds?: number; width?: number; height?: number; options?: MediaToolOptions }, onProgress?: (fraction: number) => void): Promise<string> {
  const media = MEDIA_TOOLS[input.tool].media;
  if (input.source) {
    onProgress?.(1);
    if (config.demoMode) return demoJob({ kind: input.tool, target: "-", options: normaliseOptions(input.tool, input.options), fileName: input.source.fileName, sourceUrl: input.source.previewUrl, width: input.width, height: input.height, seconds: input.seconds });
    const r = await api<{ id: string }>("/api/tool-jobs", { method: "POST", body: JSON.stringify({ tool: input.tool, from: input.source.from, seconds: input.seconds, options: input.options, rightsConfirmed: true }) });
    return r.id;
  }
  if (!input.file) throw new Error("Pick a file first.");
  const file = input.file;
  if (config.demoMode) {
    const id = `demo-${Date.now().toString(36)}`;
    const url = URL.createObjectURL(file);
    const job: EnhanceJobView = { id, kind: input.tool, status: "processing", target: "-", options: normaliseOptions(input.tool, input.options), fileName: file.name, sourceUrl: url, width: input.width, height: input.height, seconds: input.seconds, createdAt: new Date().toISOString(), demo: true };
    demoJobs = [job, ...demoJobs];
    emitDemo();
    onProgress?.(1);
    setTimeout(() => {
      demoJobs = demoJobs.map((j) => (j.id === id ? { ...j, status: "completed", resultUrl: url, finishedAt: new Date().toISOString() } : j));
      emitDemo();
    }, 5000);
    return id;
  }
  const staged = await stageUpload(media === "video" ? "source" : "image", file, onProgress);
  if (!staged) throw new Error("The upload did not finish. Try again.");
  const r = await api<{ id: string }>("/api/tool-jobs", {
    method: "POST",
    body: JSON.stringify({ tool: input.tool, stagedPath: staged.path, fileName: file.name, mime: file.type || undefined, seconds: input.seconds, options: input.options, rightsConfirmed: true }),
  });
  return r.id;
}

export function enhanceDownloadHref(job: EnhanceJobView) {
  if (job.demo || config.demoMode) return job.resultUrl ?? "#";
  return `/api/enhance/${job.id}/download`;
}
