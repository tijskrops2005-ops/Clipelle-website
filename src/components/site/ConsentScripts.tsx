"use client";

import { useEffect } from "react";
import { allows, CONSENT_EVENT, readConsent, type Consent } from "@/lib/consent";

/**
 * Loads optional scripts only after consent. Analytics: NEXT_PUBLIC_ANALYTICS_SCRIPT_SRC (+ optional
 * NEXT_PUBLIC_ANALYTICS_SITE_ID as data-site). Partner tracking: NEXT_PUBLIC_REDITUS_SCRIPT_SRC.
 * Without the variables nothing is added to the page, ever.
 */
const ANALYTICS_SRC = process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_SRC;
const ANALYTICS_SITE = process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID;
const REDITUS_SRC = process.env.NEXT_PUBLIC_REDITUS_SCRIPT_SRC;

function inject(id: string, src: string, attrs: Record<string, string> = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.src = src;
  s.async = true;
  s.defer = true;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

export function ConsentScripts() {
  useEffect(() => {
    const apply = (c: Consent | null) => {
      if (ANALYTICS_SRC && allows("analytics", c)) inject("clipelle-analytics", ANALYTICS_SRC, ANALYTICS_SITE ? { "data-site": ANALYTICS_SITE } : {});
      if (REDITUS_SRC && allows("marketing", c)) inject("clipelle-partner-tracking", REDITUS_SRC);
    };
    apply(readConsent());
    const onConsent = (e: Event) => apply((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);
  return null;
}
