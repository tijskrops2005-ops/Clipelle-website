"use client";

import { useSyncExternalStore } from "react";

/** The current year, rendered on the client so static pages prerender without a changing value. */
export function Year() {
  const year = useSyncExternalStore(() => () => {}, () => new Date().getFullYear(), () => 2026);
  return <>{year}</>;
}
