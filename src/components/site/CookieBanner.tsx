"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Cookie } from "lucide-react";
import { OPEN_CONSENT_EVENT, readConsent, writeConsent } from "@/lib/consent";
import { Button } from "@/components/ui/Button";

/**
 * Cookie banner: Reject all, Customize, Accept all. Shown until a choice is stored; reopened from
 * the footer's "Cookie settings". Nothing optional loads before Accept or a saved choice.
 */
export function CookieBanner() {
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
    <div role="dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`} className="fold-in fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-card bg-surface p-5 shadow-card-hover sm:inset-x-6 sm:bottom-6 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Cookie className="size-4" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p id={`${id}-title`} className="text-[15px] font-semibold text-ink">Cookies</p>
          <p id={`${id}-text`} className="mt-1 text-[14px] leading-relaxed text-muted">
            Necessary cookies keep you signed in and remember this choice. Optional ones are off until you allow them: analytics (how the site is used) and partner tracking (so a partner who recommended Reelay gets credit). Details in the <Link href="/legal/cookies" className="underline">cookie policy</Link>.
          </p>
          {customize && (
            <fieldset className="mt-4 space-y-2 rounded-[14px] bg-surface-muted p-4">
              <legend className="sr-only">Choose categories</legend>
              <label className="flex items-center justify-between gap-3 text-[14px] text-ink">
                <span>Necessary <span className="text-muted">(always on)</span></span>
                <input type="checkbox" checked readOnly disabled className="size-4 accent-ink" />
              </label>
              <label className="flex items-center justify-between gap-3 text-[14px] text-ink">
                <span>Analytics</span>
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="size-4 accent-ink" />
              </label>
              <label className="flex items-center justify-between gap-3 text-[14px] text-ink">
                <span>Partner tracking</span>
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="size-4 accent-ink" />
              </label>
            </fieldset>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => choose(false, false)}>Reject all</Button>
            {customize ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => choose(analytics, marketing)}>Save choices</Button>
            ) : (
              <Button type="button" variant="secondary" size="sm" onClick={() => setCustomize(true)} aria-expanded={customize}>Customize</Button>
            )}
            <Button type="button" variant="primary" size="sm" onClick={() => choose(true, true)}>Accept all</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))} className={className ?? "focus-ring rounded-control text-[15px] text-ink/80 transition-colors duration-150 hover:text-ink"}>
      Cookie settings
    </button>
  );
}
