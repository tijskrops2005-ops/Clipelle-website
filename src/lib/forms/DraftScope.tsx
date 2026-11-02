"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { clearDraft, readDraft, writeDraft, type DraftScope } from "@/lib/forms/formDraft";

/**
 * Who the drafts belong to (2 Nov 2026): the app shell knows the signed-in user and the active
 * workspace and hands them to every creation form through this context, so a draft never shows up
 * for another user on the same browser or in another workspace.
 */
const Ctx = createContext<DraftScope | null>(null);

export function DraftScopeProvider({ scope, children }: { scope: DraftScope | null; children: ReactNode }) {
  return <Ctx.Provider value={scope}>{children}</Ctx.Provider>;
}

export function useDraftScope() {
  return useContext(Ctx);
}

/**
 * Keeps `data` in the draft of `form`, a short moment after every change, while `enabled`. The first
 * value is not written (the restore sets the state first), and nothing is written after `enabled`
 * turns off (the video started: the draft was cleared).
 */
export function useDraftSaver<T>(form: string, data: T, enabled: boolean) {
  const scope = useDraftScope();
  const first = useRef(true);
  const json = JSON.stringify(data);
  useEffect(() => {
    if (!scope || !enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = window.setTimeout(() => writeDraft(form, scope, JSON.parse(json) as T), 400);
    return () => window.clearTimeout(t);
  }, [form, scope, json, enabled]);
}

/** The stored draft of `form` for the current scope, read once; null without a scope or a draft. */
export function readScopedDraft<T>(form: string, scope: DraftScope | null) {
  return scope ? readDraft<T>(form, scope) : null;
}

export function clearScopedDraft(form: string, scope: DraftScope | null) {
  if (scope) clearDraft(form, scope);
}
