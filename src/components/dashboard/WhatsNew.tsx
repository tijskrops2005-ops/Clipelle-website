import Link from "next/link";
import { changelogFor } from "@/content/changelog";
import { formatDate } from "@/lib/utils";

/** The newest changelog entry on the dashboard (24 Nov 2026, after splister.com/app): real changes, one card, a link to all. */
export function WhatsNew() {
  const latest = changelogFor("en")[0];
  if (!latest) return null;
  return (
    <section aria-labelledby="whats-new" className="relative overflow-hidden rounded-card bg-ink p-5 text-champagne shadow-card sm:p-6">
      <div className="ink-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
      <div className="flex items-center justify-between gap-3">
        <h2 id="whats-new" className="text-[15px] font-semibold text-champagne">What&apos;s new</h2>
        <span className="text-[12px] text-champagne/60">{formatDate(latest.date)}</span>
      </div>
      <p className="mt-3 text-[17px] font-semibold leading-snug text-champagne">{latest.title}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-champagne/75">{latest.items[0]}</p>
      <Link href="/resources/changelog" className="focus-ring mt-4 inline-block rounded-control text-[13px] font-medium text-gold-light underline decoration-gold-light/40 underline-offset-4 hover:decoration-gold-light">
        All updates
      </Link>
      </div>
    </section>
  );
}
