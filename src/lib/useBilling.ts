"use client";

import { useSyncExternalStore } from "react";

/**
 * Monthly or yearly billing, chosen once per page (23 Nov 2026): the plan cards, the "Clipelle vs
 * doing it yourself" calculator and the plan finder read the same switch, so one screen never shows
 * a yearly price in one block and a monthly price for the same plan in the next. Yearly is the
 * default, as on the cards. In memory only; a reload starts at yearly again.
 */
let annual = true;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setBillingAnnual(value: boolean) {
  if (annual === value) return;
  annual = value;
  listeners.forEach((l) => l());
}

export function useBillingAnnual(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => annual, () => true);
  return [value, setBillingAnnual];
}
