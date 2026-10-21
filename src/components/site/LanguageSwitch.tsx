"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOCALES, localizePath, rememberLanguage, type Locale } from "@/lib/i18n";
import { readConsent } from "@/lib/consent";

/**
 * EN | NL: links to the same page in the other language. The preference cookie is written only when
 * the visitor already made a cookie choice (consent given or refused but stored); otherwise the
 * language lives in the URL alone.
 */
export function LanguageSwitch({ locale, className }: { locale: Locale; className?: string }) {
  const pathname = usePathname() ?? "/";
  const remember = (next: Locale) => rememberLanguage(next, Boolean(readConsent()));
  return (
    <span className={cn("inline-flex items-center rounded-full bg-surface-muted p-0.5", className)} aria-label="Language">
      {LOCALES.map((l) => (
        <Link key={l} href={localizePath(pathname, l)} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined} onClick={() => remember(l)} className={cn("focus-ring rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase", l === locale ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}>
          {l}
        </Link>
      ))}
    </span>
  );
}
