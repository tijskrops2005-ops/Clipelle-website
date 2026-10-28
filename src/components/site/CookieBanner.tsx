"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Cookie } from "lucide-react";
import { OPEN_CONSENT_EVENT, readConsent, writeConsent } from "@/lib/consent";
import { Button } from "@/components/ui/Button";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

/**
 * Cookie banner: Reject all, Customize, Accept all. Shown until a choice is stored; reopened from
 * the footer's "Cookie settings". Nothing optional loads before Accept or a saved choice.
 */
export function CookieBanner({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale).cookie;
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const id = useId();

  useEffect(() => {
    const current = readConsent();
    if (!current) queueMicrotask(() => setOpen(true));
    function onOpen() {
      const c = readConsent();
      setAnalytics(Boolean(c?.analytics));
      setMarketing(Boolean(c?.marketing));
      setCustomize(true);
      setOpen(true);
    }
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
  }, []);

  function choose(a: boolean, m: boolean) {
    writeConsent({ analytics: a, marketing: m });
    setOpen(false);
    setCustomize(false);
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`} className="fold-in fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-card bg-surface p-4 shadow-card-hover sm:inset-x-6 sm:bottom-6 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Cookie className="size-4" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p id={`${id}-title`} className="text-[15px] font-semibold text-ink">{t.title}</p>
          <p id={`${id}-text`} className="mt-1 text-[13px] leading-relaxed text-muted sm:text-[14px]">
            {t.text} <Link href={localizePath("/legal/cookies", locale)} className="underline">{t.policy}</Link>.
          </p>
          {customize && (
            <fieldset className="mt-4 space-y-2 rounded-[14px] bg-surface-muted p-4">
              <legend className="sr-only">Choose categories</legend>
              <label className="flex items-center justify-between gap-3 text-[14px] text-ink">
                <span>{t.necessary} <span className="text-muted">{t.alwaysOn}</span></span>
                <input type="checkbox" checked readOnly disabled className="size-4 accent-ink" />
              </label>
              <label className="flex items-center justify-between gap-3 text-[14px] text-ink">
                <span>{t.analytics}</span>
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="size-4 accent-ink" />
              </label>
              <label className="flex items-center justify-between gap-3 text-[14px] text-ink">
                <span>{t.marketing}</span>
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="size-4 accent-ink" />
              </label>
            </fieldset>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => choose(false, false)}>{t.reject}</Button>
            {customize ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => choose(analytics, marketing)}>{t.save}</Button>
            ) : (
              <Button type="button" variant="secondary" size="sm" onClick={() => setCustomize(true)} aria-expanded={customize}>{t.customize}</Button>
            )}
            <Button type="button" variant="primary" size="sm" onClick={() => choose(true, true)}>{t.accept}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsLink({ className, label = "Cookie settings" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))} className={className ?? "focus-ring rounded-control text-[15px] text-ink/80 transition-colors duration-150 hover:text-ink"}>
      {label}
    </button>
  );
}
