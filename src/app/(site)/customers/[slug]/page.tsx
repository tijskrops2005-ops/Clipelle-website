import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { caseStudyBySlug, publishedCaseStudies } from "@/content/case-studies";
import { CtaBand } from "@/components/site/CtaBand";

export function generateStaticParams() {
  return publishedCaseStudies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = caseStudyBySlug(slug);
  return c?.permission ? { title: `${c.company}: ${c.title}`, description: c.summary } : { title: "Customers" };
}

/** The story template: content exactly as supplied, logo, quote and video only when supplied. */
export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = caseStudyBySlug(slug);
  if (!c || !c.permission) notFound();
  return (
    <article className="mx-auto max-w-2xl space-y-12 pt-16 sm:pt-24">
      <header>
        <p className="label-mono text-muted">{c.company}{c.industry ? ` · ${c.industry}` : ""}</p>
        {c.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- the customer's own logo, supplied with permission
          <img src={c.logo} alt={`${c.company} logo`} className="mt-4 h-10 w-auto" />
        )}
        <h1 className="text-display mt-4">{c.title}</h1>
        <p className="mt-4 text-subtitle text-muted">{c.summary}</p>
      </header>
      {c.videoUrl && <video src={c.videoUrl} controls playsInline className="aspect-[9/16] w-full max-w-xs rounded-tile bg-ink" />}
      {c.sections.map((s) => (
        <section key={s.heading} className="space-y-3">
          <h2 className="text-title">{s.heading}</h2>
          {s.paragraphs.map((p, i) => <p key={i} className="text-[17px] leading-relaxed text-ink/90">{p}</p>)}
        </section>
      ))}
      {c.quote && (
        <blockquote className="rounded-card bg-surface-muted p-6">
          <p className="text-[20px] font-medium leading-snug text-ink">“{c.quote.text}”</p>
          {(c.quote.name || c.quote.role) && <footer className="mt-3 text-[14px] text-muted">{[c.quote.name, c.quote.role].filter(Boolean).join(", ")}</footer>}
        </blockquote>
      )}
      <CtaBand />
    </article>
  );
}
