import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogCategories, categoryBySlug } from "@/content/blogCategories";
import { postsByCategory } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";
import { SectionIntro } from "@/components/site/SectionIntro";
import { BlogCard } from "@/components/site/BlogCard";
import { CtaBand } from "@/components/site/CtaBand";
import { CategoryChips } from "../../page";

export function generateStaticParams() {
  return blogCategories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = categoryBySlug(category);
  return { title: c ? `${c.label} · Blog` : "Blog", description: c?.text, alternates: { canonical: absoluteUrl(`/blog/category/${category}`) } };
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const c = categoryBySlug(category);
  if (!c) notFound();
  const posts = postsByCategory(category);
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Blog" title={c.label} text={c.text} />
      <CategoryChips active={category} />
      {posts.length === 0 ? <p className="text-center text-muted">No articles in this category yet.</p> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <BlogCard key={p.slug} post={p} />)}
        </div>
      )}
      <CtaBand />
    </div>
  );
}
