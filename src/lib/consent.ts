/**
 * Cookie consent, browser-safe. One cookie, `clipelle_consent`, holds the visitor's choice; it is a
 * necessary cookie (it only stores the choice). Nothing optional loads before a choice is made.
 * Categories: analytics (Google Analytics cookies, see src/components/GoogleAnalytics.tsx, and an
 * optional script set by NEXT_PUBLIC_ANALYTICS_SCRIPT_SRC) and marketing (partner tracking set by
 * NEXT_PUBLIC_REDITUS_SCRIPT_SRC). Without those variables nothing loads.
 */
export type Consent = { v: 1; necessary: true; analytics: boolean; marketing: boolean; at: string };

export const CONSENT_COOKIE = "clipelle_consent";
const MAX_AGE_DAYS = 180;
export const CONSENT_EVENT = "clipelle:consent";
export const OPEN_CONSENT_EVENT = "clipelle:open-consent";

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  // Read the current name, else the pre-rename cookie once (22 Oct 2026); the next save writes the new name.
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`)) ?? document.cookie.match(/(?:^|; )reelay_consent=([^;]*)/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1])) as Partial<Consent>;
    if (parsed.v !== 1) return null;
    return { v: 1, necessary: true, analytics: Boolean(parsed.analytics), marketing: Boolean(parsed.marketing), at: String(parsed.at ?? "") };
  } catch {
    return null;
  }
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }): Consent {
  const consent: Consent = { v: 1, necessary: true, analytics: choice.analytics, marketing: choice.marketing, at: new Date().toISOString() };
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${MAX_AGE_DAYS * 24 * 3600}; Path=/; SameSite=Lax${secure}`;
  updateGoogleConsent(consent.analytics);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
  return consent;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Consent mode v2: Accept grants analytics cookies; Decline or a withdrawal denies them and removes the _ga cookies. */
function updateGoogleConsent(analytics: boolean) {
  window.gtag?.("consent", "update", { analytics_storage: analytics ? "granted" : "denied" });
  if (analytics) return;
  const parts = location.hostname.split(".");
  const domains = ["", location.hostname, parts.length > 1 ? `.${parts.slice(-2).join(".")}` : ""].filter((d, i, a) => a.indexOf(d) === i);
  for (const name of document.cookie.split("; ").map((c) => c.split("=")[0]).filter((n) => n === "_ga" || n.startsWith("_ga_"))) {
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ""}`;
  }
}

/** True when the visitor allowed the category (necessary is always allowed). */
export function allows(category: "necessary" | "analytics" | "marketing", consent = readConsent()): boolean {
  if (category === "necessary") return true;
  return Boolean(consent?.[category]);
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
