import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { LegalDoc } from "@/content/legal";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { FinalCta } from "@/components/site/Persuasion";

/**
 * Renders a legal document from src/content/legal/ (with a "Draft, to be reviewed" badge while it is
 * one), then the site's closing band at content width (23 Nov 2026: legal pages ended without it).
 */
export function LegalPage({ doc, locale = "en" }: { doc: LegalDoc; locale?: Locale }) {
  const t = dict(locale).legal;
  // The date in the reader's language ("23 Nov 2026", Dutch "23 nov 2026"), fixed time zone so the page prerenders.
  const updated = locale === "nl" ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" }).format(new Date(doc.updated)) : formatDate(doc.updated);
  return (
    <div className="space-y-24 pt-16 sm:space-y-32 sm:pt-24">
      <article className="mx-auto max-w-2xl space-y-10">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-mono text-muted">{t.eyebrow}</p>
            {doc.draft && <Badge tone="warning">{t.draft}</Badge>}
          </div>
          <h1 className="text-display mt-3">{doc.title}</h1>
          <p className="mt-4 text-subtitle text-muted">{doc.summary}</p>
          <p className="mt-2 text-[13px] text-muted">{t.updated} {updated}</p>
        </header>
        {doc.sections.map((s) => (
          <section key={s.heading} className="space-y-3">
            <h2 className="text-title">{s.heading}</h2>
            {s.paragraphs?.map((p, i) => <p key={i} className="text-[17px] leading-relaxed text-ink/90">{p}</p>)}
            {s.bullets && (
              <ul className="list-disc space-y-1.5 pl-5 text-[17px] leading-relaxed text-ink/90">
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
          </section>
        ))}
      </article>
      <FinalCta locale={locale} />
    </div>
  );
}
