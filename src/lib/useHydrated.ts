"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False in the server-rendered HTML and during hydration, true once React is attached.
 * Forms use it to keep their submit button disabled until the click can reach React:
 * a click on the static HTML would otherwise submit the form natively and reload the page.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
