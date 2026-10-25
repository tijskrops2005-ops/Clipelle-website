import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allTags, postsByTag } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";
import { SectionIntro } from "@/components/site/SectionIntro";
import { BlogCard } from "@/components/site/BlogCard";
import { FinalCta } from "@/components/site/Persuasion";
import { CategoryChips } from "../../page";

export function generateStaticParams() {
  return allTags().map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const t = decodeURIComponent(tag);
  return { title: `#${t} · Blog`, description: `Articles tagged ${t}.`, alternates: { canonical: absoluteUrl(`/blog/tag/${encodeURIComponent(t)}`) } };
}

export default async function BlogTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const t = decodeURIComponent(tag);
  const posts = postsByTag(t);
  if (posts.length === 0) notFound();
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Tag" title={`#${t}`} text={`${posts.length} article${posts.length === 1 ? "" : "s"}`} />
      <CategoryChips />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => <BlogCard key={p.slug} post={p} />)}
      </div>
      <FinalCta />
    </div>
  );
}
