"use client";

import { useSyncExternalStore } from "react";

/**
 * In-app notifications (client only): projects that reached "completed" or "failed" while the
 * customer was away from the Projects page. The badge on Projects counts them, a toast shows the
 * latest ones, and the browser tab title carries the count. Persisted per browser so a reload
 * keeps the badge; cleared when the Projects page is opened.
 */
export type AppNotice = { id: string; projectId: string; name: string; status: "completed" | "failed"; at: number; href: string };

const KEY = "reelay.notices.v1";
let notices: AppNotice[] = [];
let toasts: AppNotice[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) notices = JSON.parse(raw) as AppNotice[];
  } catch {
    /* keep empty */
  }
}
function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(notices.slice(0, 50)));
  } catch {
    /* in memory only */
  }
}
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  load();
  return () => listeners.delete(l);
}

export function pushNotice(n: Omit<AppNotice, "id" | "at">) {
  load();
  const notice: AppNotice = { ...n, id: `${n.projectId}:${n.status}:${Date.now()}`, at: Date.now() };
  if (notices.some((x) => x.projectId === n.projectId && x.status === n.status)) return;
  notices = [notice, ...notices];
  toasts = [notice, ...toasts].slice(0, 3);
  save();
  emit();
  window.setTimeout(() => dismissToast(notice.id), 8000);
}
export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
export function markAllSeen() {
  load();
  if (notices.length === 0) return;
  notices = [];
  save();
  emit();
}

const none: AppNotice[] = [];
export function useNotices() {
  return useSyncExternalStore(subscribe, () => notices, () => none);
}
export function useToasts() {
  return useSyncExternalStore(subscribe, () => toasts, () => none);
}
export function useUnseenCount() {
  return useNotices().length;
}
