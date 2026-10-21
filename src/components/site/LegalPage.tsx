import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { LegalDoc } from "@/content/legal";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";

/** Renders a legal document from src/content/legal/ with a "Draft, to be reviewed" badge while it is one. */
export function LegalPage({ doc, locale = "en" }: { doc: LegalDoc; locale?: Locale }) {
  const t = dict(locale).legal;
  return (
    <article className="mx-auto max-w-2xl space-y-10 pt-16 sm:pt-24">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <p className="label-mono text-muted">{t.eyebrow}</p>
          {doc.draft && <Badge tone="warning">{t.draft}</Badge>}
        </div>
        <h1 className="text-display mt-3">{doc.title}</h1>
        <p className="mt-4 text-subtitle text-muted">{doc.summary}</p>
        <p className="mt-2 text-[13px] text-muted">{t.updated} {formatDate(doc.updated)}</p>
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
  );
}
