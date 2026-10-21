import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HeaderAccount, SignedOutButtons } from "@/components/site/HeaderAccount";
import { CookieBanner } from "@/components/site/CookieBanner";
import { ConsentScripts } from "@/components/site/ConsentScripts";
import { HtmlLang } from "@/components/site/HtmlLang";
import type { Locale } from "@/lib/i18n";

/** The public marketing site frame in one language: header, footer, cookie banner, consent-gated scripts. */
export function SiteFrame({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <HtmlLang lang={locale} />
      {/* The header reads the pathname (active menu, language switch); behind Suspense it still prerenders on
          static pages and streams in on request-rendered ones (story pages without a static list). */}
      <Suspense fallback={<div className="h-20" aria-hidden />}>
        <SiteHeader
          locale={locale}
          account={
            <Suspense fallback={<SignedOutButtons locale={locale} />}>
              <HeaderAccount locale={locale} />
            </Suspense>
          }
        />
      </Suspense>
      <main className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">{children}</main>
      <SiteFooter locale={locale} />
      <CookieBanner locale={locale} />
      <ConsentScripts />
    </div>
  );
}
