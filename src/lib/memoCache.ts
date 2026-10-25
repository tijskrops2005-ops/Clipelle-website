import "server-only";

/**
 * An in-memory, per-process cache for free provider listings (presenters, voices), stored on
 * globalThis so dev reloads keep it. Stale-while-revalidate: after `freshMs` the old value is
 * served at once and a refresh runs in the background, so only the very first request after a
 * server start waits for the provider. Concurrent first requests share one load; a failed load
 * keeps the last good value (or throws when there is none yet).
 */
type Entry<T> = { at: number; value: T };
type Slot<T> = { entry?: Entry<T>; pending?: Promise<T> };

const store = globalThis as unknown as { __clipelleMemo?: Map<string, Slot<unknown>> };

export async function memoCached<T>(key: string, freshMs: number, load: () => Promise<T>): Promise<T> {
  const slots = (store.__clipelleMemo ??= new Map());
  const slot = (slots.get(key) ?? {}) as Slot<T>;
  slots.set(key, slot);

  const refresh = () => {
    slot.pending ??= load()
      .then((value) => {
        slot.entry = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        slot.pending = undefined;
      });
    return slot.pending;
  };

  if (slot.entry) {
    if (Date.now() - slot.entry.at >= freshMs) refresh().catch(() => {}); // stale: serve now, refresh quietly
    return slot.entry.value;
  }
  return refresh();
}
