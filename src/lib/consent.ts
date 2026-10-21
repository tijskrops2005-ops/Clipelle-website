/**
 * Cookie consent, browser-safe. One cookie, `reelay_consent`, holds the visitor's choice; it is a
 * necessary cookie (it only stores the choice). Nothing optional loads before a choice is made.
 * Categories: analytics (a provider script set by NEXT_PUBLIC_ANALYTICS_SCRIPT_SRC) and marketing
 * (partner tracking set by NEXT_PUBLIC_REDITUS_SCRIPT_SRC). Without those variables nothing loads.
 */
export type Consent = { v: 1; necessary: true; analytics: boolean; marketing: boolean; at: string };

export const CONSENT_COOKIE = "reelay_consent";
const MAX_AGE_DAYS = 180;
export const CONSENT_EVENT = "reelay:consent";
export const OPEN_CONSENT_EVENT = "reelay:open-consent";

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
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
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
  return consent;
}

/** True when the visitor allowed the category (necessary is always allowed). */
export function allows(category: "necessary" | "analytics" | "marketing", consent = readConsent()): boolean {
  if (category === "necessary") return true;
  return Boolean(consent?.[category]);
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
