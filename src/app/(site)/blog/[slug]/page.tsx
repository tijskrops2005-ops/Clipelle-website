import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { allPosts, BLOG_AUTHOR, postBySlug, relatedPosts, splitAtHeading } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";
import { formatDate } from "@/lib/utils";
import { config } from "@/lib/config";
import { LogoMark } from "@/components/Logo";
import { FinalCta } from "@/components/site/Persuasion";
import { InlineCta } from "@/components/site/InlineCta";
import { JsonLd } from "@/components/site/JsonLd";
import { ShareLinks } from "@/components/site/ShareLinks";

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = postBySlug(slug);
  if (!p) return { title: "Article" };
  const url = absoluteUrl(`/blog/${p.slug}`);
  return {
    title: p.title,
    description: p.summary,
    alternates: { canonical: url },
    openGraph: { type: "article", title: p.title, description: p.summary, url, publishedTime: p.date, authors: [BLOG_AUTHOR], tags: p.tags },
    twitter: { card: "summary_large_image", title: p.title, description: p.summary },
  };
}

/** Article page: title, date, reading time, the text with one call-to-action block, share, related (23 Nov 2026: no summary, no tag row). */
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();
  const url = absoluteUrl(`/blog/${post.slug}`);
  // While ads are switched off, an article about the ad tools says so above its first line: such an
  // article describes the ad form from its first section on. Nothing in the markdown changes.
  const soonNote = !config.features.ads && post.aboutAds;
  const [first, second] = splitAtHeading(post.html, 3);
  const related = relatedPosts(post);
  const ctaVariant = post.category === "translation" ? "translate" : "ad";
  return (
    <article className="pt-12 sm:pt-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          dateModified: post.date,
          author: { "@type": "Organization", name: BLOG_AUTHOR },
          publisher: { "@type": "Organization", name: config.productName, url: absoluteUrl("/") },
          mainEntityOfPage: url,
          image: absoluteUrl(`/blog/${post.slug}/opengraph-image`),
          wordCount: post.words,
          articleSection: post.categoryLabel,
          keywords: post.tags.join(", "),
        }}
      />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") }, { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") }, { "@type": "ListItem", position: 3, name: post.categoryLabel, item: absoluteUrl(`/blog/category/${post.category}`) }, { "@type": "ListItem", position: 4, name: post.title, item: url }] }} />
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/blog" className="focus-ring inline-flex items-center gap-1.5 rounded-control hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> Blog</Link>
        <span className="mx-2">/</span>
        <Link href={`/blog/category/${post.category}`} className="focus-ring rounded-control hover:text-ink">{post.categoryLabel}</Link>
      </nav>
      <header className="mt-6 max-w-3xl">
        <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.03em]">{post.title}</h1>
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-2"><LogoMark size={24} className="rounded-full" />{BLOG_AUTHOR}</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>{post.readingMinutes} min read</span>
        </p>
      </header>
      {/* No cover band here (23 Nov 2026): it was a wide empty panel; the cards keep their covers. */}
      <div className="mt-10 grid gap-10 border-t border-divider pt-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {post.toc.length > 1 && (
            <nav aria-label="On this page">
              <p className="text-[13px] font-medium text-ink">On this page</p>
              <ol className="mt-3 space-y-1.5">
                {post.toc.map((h) => (
                  <li key={h.id}><a href={`#${h.id}`} className="focus-ring block rounded-control text-[14px] text-muted hover:text-ink">{h.text}</a></li>
                ))}
              </ol>
            </nav>
          )}
        </aside>
        {/* Only the article text sits in the prose styles; the call to action, tags and share pills keep their own look. */}
        <div className="min-w-0 max-w-2xl">
          {soonNote && (
            <p className="mb-8 rounded-[12px] border border-warning/30 bg-warning/5 px-4 py-3 text-[15px] leading-relaxed text-ink">
              <strong className="font-semibold">Coming soon.</strong> Ads from a photo and from a link are not open yet, so this article describes how they will work. Translating a video you own works today: <Link href="/platform/translate" className="underline underline-offset-4">how translation works</Link>.
            </p>
          )}
          <div className="prose-clipelle"><div dangerouslySetInnerHTML={{ __html: first }} /></div>
          {second && <InlineCta variant={ctaVariant} />}
          {second && <div className="prose-clipelle"><div dangerouslySetInnerHTML={{ __html: second }} /></div>}
          <div className="mt-10"><ShareLinks url={url} title={post.title} /></div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20 max-w-2xl">
          <h2 className="text-title">Related articles</h2>
          <ul className="mt-6 divide-y divide-divider border-y border-divider">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="focus-ring flex flex-col gap-1 rounded-control py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <span className="text-[16px] font-medium text-ink">{p.title}</span>
                  <span className="shrink-0 text-[13px] text-muted">{formatDate(p.date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-20"><FinalCta /></div>
    </article>
  );
}
