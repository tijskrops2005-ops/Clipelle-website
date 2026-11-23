import type { Metadata } from "next";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";
import { BlogIndex } from "@/components/site/BlogIndex";

const locale = "nl" as const;
const t = dict(locale);
export const metadata: Metadata = { ...pageMeta(locale, "/blog", { title: "Blog", description: t.blog.metaDescription }), alternates: { canonical: "/blog" } };

/** /nl/blog: the same overview as /blog with Dutch words around it; the articles are English for now and the page says so. */
export default function DutchBlogPage() {
  return <BlogIndex locale={locale} />;
}
