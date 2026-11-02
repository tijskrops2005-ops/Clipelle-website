/**
 * Form drafts (2 Nov 2026): what a customer typed and chose on a creation form survives a refresh,
 * a navigation and a closed tab. One draft per form, per user and per workspace, in this browser's
 * localStorage; a draft is cleared when the video starts and when "Create new video" opens a fresh
 * form. A video picked on the translate form is uploaded at once to a staged place in storage
 * (`src/app/api/uploads/stage`), so the draft only has to remember where it is.
 *
 * Pure: the store is a parameter, so the rules are tested with a Map (formDraft.test.ts).
 */
export type DraftScope = { userId: string; workspaceId: string };

export type DraftStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
};

export const DRAFT_PREFIX = "clipelle.draft.v1";
/** A draft older than this is forgotten: the choices of a week ago are rarely what the next video needs. */
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type StoredDraft<T> = { data: T; savedAt: string };

function browserStore(): DraftStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function draftKey(form: string, scope: DraftScope) {
  return `${DRAFT_PREFIX}:${scope.userId}:${scope.workspaceId}:${form}`;
}

/** The stored draft of this form for this user and workspace, or null when there is none, it is stale or unreadable. */
export function readDraft<T>(form: string, scope: DraftScope, store: DraftStore | null = browserStore(), now = Date.now()): StoredDraft<T> | null {
  if (!store) return null;
  const key = draftKey(form, scope);
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft<T>> | null;
    if (!parsed || typeof parsed !== "object" || typeof parsed.savedAt !== "string" || parsed.data === undefined) return null;
    const age = now - Date.parse(parsed.savedAt);
    if (!Number.isFinite(age) || age > DRAFT_MAX_AGE_MS) {
      store.removeItem(key);
      return null;
    }
    return { data: parsed.data as T, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function writeDraft<T>(form: string, scope: DraftScope, data: T, store: DraftStore | null = browserStore(), now = Date.now()) {
  if (!store) return;
  try {
    store.setItem(draftKey(form, scope), JSON.stringify({ data, savedAt: new Date(now).toISOString() } satisfies StoredDraft<T>));
  } catch {
    /* quota or private mode: the form still works, it just does not remember */
  }
}

export function clearDraft(form: string, scope: DraftScope, store: DraftStore | null = browserStore()) {
  if (!store) return;
  try {
    store.removeItem(draftKey(form, scope));
  } catch {
    /* ignore */
  }
}

/** Every draft of this user in this workspace: "Create new video" starts clean. Other users' and workspaces' drafts stay. */
export function clearDrafts(scope: DraftScope, store: DraftStore | null = browserStore()) {
  if (!store) return;
  const prefix = `${DRAFT_PREFIX}:${scope.userId}:${scope.workspaceId}:`;
  const keys: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    for (const k of keys) store.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** A Map-backed store for tests and for the moment before the browser is there. */
export function memoryStore(): DraftStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}
