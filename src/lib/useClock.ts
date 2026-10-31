"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * The wall clock for anything on screen that depends on "now" (31 Oct 2026): null in the server
 * HTML and during hydration, so the markup the browser checks is the same as the server's, then
 * `Date.now()` once React is attached, refreshed every `intervalMs` (0 = once). Before it, screens
 * use `dataClock()` from src/lib/translateProgress.ts: a time taken from the data itself, identical
 * on both sides. The dashboard used to render "3 min" from the server's clock and re-render the
 * whole tree on every visit with a running video (hydration mismatch, a reload loop in development).
 */
export function useClock(intervalMs = 0): number | null {
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!intervalMs) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return hydrated ? now : null;
}
