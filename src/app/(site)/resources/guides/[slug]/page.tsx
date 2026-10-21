import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { guideBySlug, guides } from "@/content/guides";
import { CtaBand } from "@/components/site/CtaBand";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  return { title: g ? g.title : "Guide", description: g?.summary };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();
  return (
    <article className="mx-auto max-w-2xl space-y-12 pt-16 sm:pt-24">
      <div>
        <Link href="/resources/guides" className="focus-ring inline-flex items-center gap-1.5 rounded-control text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> Guides</Link>
        <p className="label-mono mt-6 text-muted">{g.minutes} min read</p>
        <h1 className="text-display mt-3">{g.title}</h1>
        <p className="mt-4 text-subtitle text-muted">{g.summary}</p>
      </div>
      {g.sections.map((s) => (
        <section key={s.heading} className="space-y-3">
          <h2 className="text-title">{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="text-[17px] leading-relaxed text-ink/90">{p}</p>
          ))}
        </section>
      ))}
      <CtaBand />
    </article>
  );
}
