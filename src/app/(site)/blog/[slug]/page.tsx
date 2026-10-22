import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { allPosts, BLOG_AUTHOR, postBySlug, relatedPosts, splitAtHeading } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";
import { formatDate } from "@/lib/utils";
import { config } from "@/lib/config";
import { BlogCard } from "@/components/site/BlogCard";
import { BlogCover } from "@/components/site/BlogCover";
import { CtaBand } from "@/components/site/CtaBand";
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

/** Article page: cover, meta, table of contents, body with one CTA block in the middle, share, related. */
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();
  const url = absoluteUrl(`/blog/${post.slug}`);
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
        <p className="mt-4 text-subtitle text-muted">{post.summary}</p>
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-surface" aria-hidden>R</span>{BLOG_AUTHOR}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </p>
      </header>
      <BlogCover title={post.title} category={post.category} className="mt-8 aspect-[21/9] rounded-card shadow-card" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {post.toc.length > 1 && (
            <nav aria-label="On this page">
              <p className="label-mono text-muted">On this page</p>
              <ol className="mt-3 space-y-1.5">
                {post.toc.map((h) => (
                  <li key={h.id}><a href={`#${h.id}`} className="focus-ring block rounded-control text-[14px] text-muted hover:text-ink">{h.text}</a></li>
                ))}
              </ol>
            </nav>
          )}
          <div className="mt-6 hidden lg:block"><ShareLinks url={url} title={post.title} /></div>
        </aside>
        <div className="prose-clipelle max-w-2xl">
          <div dangerouslySetInnerHTML={{ __html: first }} />
          {second && <InlineCta variant={ctaVariant} />}
          <div dangerouslySetInnerHTML={{ __html: second }} />
          <div className="mt-10 flex flex-wrap items-center gap-2">
            {post.tags.map((t) => (
              <Link key={t} href={`/blog/tag/${encodeURIComponent(t)}`} className="focus-ring inline-flex rounded-full bg-surface px-3 py-1.5 text-[13px] text-ink shadow-card hover:bg-surface-muted">#{t}</Link>
            ))}
          </div>
          <div className="mt-8 lg:hidden"><ShareLinks url={url} title={post.title} /></div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20 space-y-6">
          <h2 className="text-title">Related articles</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => <BlogCard key={p.slug} post={p} />)}
          </div>
        </section>
      )}
      <div className="mt-20"><CtaBand /></div>
    </article>
  );
}
