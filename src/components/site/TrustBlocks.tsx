import { Star } from "lucide-react";
import { hasTrustContent, trust, type TrustContent } from "@/content/trust";
import { trustExample } from "@/content/trust.example";
import { Marquee } from "@/components/site/Marquee";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";

/**
 * Logo row, reviews, numbers and press. Rendered from src/content/trust.ts only; an empty list hides
 * its block everywhere (28 Oct 2026, Tijs: the example layout looked like test content in
 * development too). To judge the design with the labelled example layout, start the dev server with
 * NEXT_PUBLIC_TRUST_PREVIEW=true. The product facts block was removed on 25 Oct 2026: it repeated the cards on /trust.
 */
export function TrustBlocks() {
  const showExample = !hasTrustContent() && process.env.NEXT_PUBLIC_TRUST_PREVIEW === "true";
  const content: TrustContent | null = hasTrustContent() ? trust : showExample ? trustExample : null;

  return (
    <section className="space-y-14">
      {content && showExample && (
        <p role="status" className="mx-auto w-fit rounded-full border border-warning/40 bg-warning/10 px-4 py-1.5 text-[13px] text-ink">
          Example layout, replace with real content in <code className="font-mono">src/content/trust.ts</code>. Not shown in production.
        </p>
      )}

      {content && content.logos.length > 0 && (
        <Reveal>
          <p className="label-mono mb-6 text-center text-muted">Used by</p>
          <Marquee ariaLabel="Customer logos" items={content.logos.map((l) => (l.src ? <img key={l.name} src={l.src} alt={l.name} className="h-8 w-auto opacity-70" /> : <span key={l.name} className="grid h-8 min-w-32 place-items-center rounded-chip bg-surface-muted px-4 text-[13px] text-muted">{l.name}</span>))} />
        </Reveal>
      )}

      {content && content.numbers.length > 0 && (
        <Reveal>
          <dl className="grid gap-4 sm:grid-cols-3">
            {content.numbers.map((n, i) => (
              <div key={i} className="rounded-card bg-surface p-6 text-center shadow-card">
                <dd className="text-display">{n.value}</dd>
                <dt className="mt-1 text-[15px] text-muted">{n.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      )}

      {content && content.reviews.length > 0 && (
        <Reveal>
          <SectionIntro eyebrow="Reviews" title="What customers say" />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {content.reviews.map((r, i) => (
              <li key={i} className="flex flex-col rounded-card bg-surface p-6 shadow-card">
                <div className="flex gap-0.5" aria-label={`${r.stars} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, s) => (
                    <Star key={s} className={s < r.stars ? "size-4 fill-warning text-warning" : "size-4 text-border"} aria-hidden />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink/90">{r.text}</p>
                <p className="mt-5 text-sm font-semibold text-ink">{r.name}</p>
                <p className="text-[13px] text-muted">{r.role}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {content && content.press.length > 0 && (
        <Reveal>
          <p className="label-mono mb-6 text-center text-muted">As seen in</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {content.press.map((p) => (p.src ? <img key={p.name} src={p.src} alt={p.name} className="h-6 w-auto opacity-70" /> : <span key={p.name} className="text-[13px] text-muted">{p.name}</span>))}
          </div>
        </Reveal>
      )}

    </section>
  );
}
