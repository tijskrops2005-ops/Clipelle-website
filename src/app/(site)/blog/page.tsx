import type { Metadata } from "next";
import Link from "next/link";
import { blogCategories } from "@/content/blogCategories";
import { allPosts, allTags } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";
import { SectionIntro } from "@/components/site/SectionIntro";
import { BlogCard } from "@/components/site/BlogCard";
import { CtaBand } from "@/components/site/CtaBand";
import { JsonLd } from "@/components/site/JsonLd";

export const metadata: Metadata = {
  title: "Blog",
  description: "Practical articles on product video ads, scripts and hooks, captions, translation and what a video really costs. Written by the Clipelle team.",
  alternates: { canonical: absoluteUrl("/blog"), types: { "application/rss+xml": absoluteUrl("/blog/rss.xml") } },
};

/** The blog overview: three featured (newest) articles, category filters, every article. */
export default function BlogPage() {
  const posts = allPosts();
  const featured = posts.slice(0, 3);
  const rest = posts.slice(3);
  const tags = allTags();
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Blog", name: "Clipelle blog", url: absoluteUrl("/blog"), description: metadata.description }} />
      <SectionIntro eyebrow="Blog" title="Short videos, explained from the inside" text="What we learn building Clipelle: product video, spoken scripts, captions, translation and costs. No filler, no made-up numbers." />
      <CategoryChips />
      {posts.length === 0 ? (
        <p className="text-center text-muted">No articles yet.</p>
      ) : (
        <>
          <section aria-label="Featured" className="grid gap-5 md:grid-cols-3">
            {featured.map((p) => (
              <BlogCard key={p.slug} post={p} featured />
            ))}
          </section>
          {rest.length > 0 && (
            <section aria-label="All articles" className="space-y-6">
              <h2 className="text-title">All articles</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <BlogCard key={p.slug} post={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {tags.length > 0 && (
        <section aria-label="Tags" className="space-y-3">
          <p className="label-mono text-muted">Tags</p>
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t}>
                <Link href={`/blog/tag/${encodeURIComponent(t)}`} className="focus-ring inline-flex rounded-full bg-surface px-3 py-1.5 text-[13px] text-ink shadow-card hover:bg-surface-muted">#{t}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <CtaBand />
    </div>
  );
}

export function CategoryChips({ active }: { active?: string }) {
  return (
    <nav aria-label="Categories" className="flex flex-wrap justify-center gap-2">
      <Link href="/blog" aria-current={!active ? "page" : undefined} className={`focus-ring rounded-full px-4 py-2 text-sm font-medium ${!active ? "bg-ink text-surface" : "bg-surface text-ink shadow-card hover:bg-surface-muted"}`}>All</Link>
      {blogCategories.map((c) => (
        <Link key={c.slug} href={`/blog/category/${c.slug}`} aria-current={active === c.slug ? "page" : undefined} className={`focus-ring rounded-full px-4 py-2 text-sm font-medium ${active === c.slug ? "bg-ink text-surface" : "bg-surface text-ink shadow-card hover:bg-surface-muted"}`}>{c.label}</Link>
      ))}
    </nav>
  );
}
