import { absoluteUrl } from "@/lib/site";

/**
 * Two site languages: English at the root, Dutch under /nl. Adding a language = add it to LOCALES,
 * a dictionary file in src/content/i18n/ and a route folder under src/app/<locale>/ that re-exports
 * the same page components. The app itself (dashboard, forms, settings) stays English.
 * Browser-safe.
 */
export type Locale = "en" | "nl";
// English only since 25 Nov 2026 (Tijs): the Dutch site is gone, /nl/* redirects to the English page.
// The "nl" dictionary stays in the code for now (docs/removed-blocks.md); nothing renders it.
export const LOCALES: Locale[] = ["en"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", nl: "Nederlands" };
export const LANG_COOKIE = "clipelle_lang";

/** Stores the language preference, only when a cookie choice exists (the consent cookie). Browser only. */
export function rememberLanguage(locale: Locale, hasConsentChoice: boolean) {
  if (typeof document === "undefined" || !hasConsentChoice) return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANG_COOKIE}=${locale}; Max-Age=${365 * 24 * 3600}; Path=/; SameSite=Lax${secure}`;
}

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as string[]).includes(v);

/** The same page in another language: "/pricing" → "/nl/pricing"; app and auth paths stay as they are. */
export function localizePath(path: string, locale: Locale) {
  const clean = stripLocale(path).path;
  if (locale === DEFAULT_LOCALE || !isLocale(locale)) return clean;
  if (!isSitePath(clean)) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

export function stripLocale(path: string): { locale: Locale; path: string } {
  for (const l of ["nl"] as Locale[]) {
    if (path === `/${l}`) return { locale: l, path: "/" };
    if (path.startsWith(`/${l}/`)) return { locale: l, path: path.slice(l.length + 1) };
  }
  return { locale: DEFAULT_LOCALE, path };
}

/** Marketing paths have a translated twin; the app, auth, docs, blog and guides do not. */
const APP_PREFIXES = ["/dashboard", "/projects", "/settings", "/new", "/login", "/signup", "/forgot-password", "/reset-password", "/verify", "/auth", "/api", "/dev", "/invite", "/docs", "/blog", "/resources/guides"];
export function isSitePath(path: string) {
  return !APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** The canonical address (English only since 25 Nov 2026, so no hreflang alternates). */
export function alternatesFor(path: string, locale: Locale) {
  void locale;
  return { canonical: absoluteUrl(stripLocale(path).path) };
}

/** Metadata for a site page in one call: title, description, canonical and hreflang. */
export function pageMeta(locale: Locale, path: string, m: { title: string; description?: string }) {
  return { title: m.title, description: m.description, alternates: alternatesFor(path, locale), openGraph: { locale: locale === "nl" ? "nl_NL" : "en_US", title: m.title, description: m.description, url: absoluteUrl(localizePath(path, locale)) } };
}
