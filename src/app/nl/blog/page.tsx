import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";
import { allPosts } from "@/lib/blog";
import { SectionIntro } from "@/components/site/SectionIntro";
import { BlogCard } from "@/components/site/BlogCard";
import { CtaBand } from "@/components/site/CtaBand";

const locale = "nl" as const;
const t = dict(locale);
export const metadata: Metadata = { ...pageMeta(locale, "/blog", { title: "Blog", description: t.nav.items["/blog"].text }), alternates: { canonical: "/blog" } };

/** /nl/blog: the articles are English for now; this page says so and lists them. */
export default function DutchBlogPage() {
  const posts = allPosts();
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Blog" title={t.home.blogTitle} text={t.common.articlesEnglish} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <BlogCard key={p.slug} post={p} />)}</div>
      <p className="text-center text-[15px] text-muted"><Link href="/blog" className="underline">{t.home.allArticles}</Link></p>
      <CtaBand locale={locale} />
    </div>
  );
}
