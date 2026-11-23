import Link from "next/link";
import { blogCategories } from "@/content/blogCategories";
import { orderedPosts } from "@/lib/blog";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { PageHero } from "@/components/site/PageHero";
import { BlogCard } from "@/components/site/BlogCard";
import { FinalCta } from "@/components/site/Persuasion";

/**
 * The blog overview, one page for /blog and /nl/blog: the title, the category row, three featured
 * articles, the rest, the closing band (23 Nov 2026: no subtitle, no tag cloud). The articles are
 * English; the Dutch page says so in one line. Translation articles lead while ads are off.
 */
export function BlogIndex({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  const b = t.blog;
  const posts = orderedPosts();
  const featured = posts.slice(0, 3);
  const rest = posts.slice(3);
  return (
    <div className="space-y-24 sm:space-y-32">
      <div className="space-y-10">
        <PageHero title={b.title} text={locale !== "en" ? t.common.articlesEnglish : undefined} />
        <CategoryChips locale={locale} />
        {posts.length === 0 ? (
          <p className="text-center text-muted">{b.empty}</p>
        ) : (
          <>
            <section aria-label={b.featured} className="grid gap-5 md:grid-cols-3">
              {featured.map((p) => (
                <BlogCard key={p.slug} post={p} featured />
              ))}
            </section>
            {rest.length > 0 && (
              <section aria-label={b.allArticles} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <BlogCard key={p.slug} post={p} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
      <FinalCta locale={locale} />
    </div>
  );
}

/** The category row above every blog list; "All" leads back to the overview in the reader's language. */
export function CategoryChips({ active, locale = "en" }: { active?: string; locale?: Locale }) {
  const b = dict(locale).blog;
  const chip = (on: boolean) => `focus-ring rounded-full px-4 py-2 text-sm font-medium ${on ? "bg-ink text-surface" : "bg-surface text-ink shadow-card hover:bg-surface-muted"}`;
  return (
    <nav aria-label="Categories" className="flex flex-wrap justify-center gap-2">
      <Link href={locale === "nl" ? "/nl/blog" : "/blog"} aria-current={!active ? "page" : undefined} className={chip(!active)}>{b.all}</Link>
      {blogCategories.map((c) => (
        <Link key={c.slug} href={`/blog/category/${c.slug}`} aria-current={active === c.slug ? "page" : undefined} className={chip(active === c.slug)}>{b.categories[c.slug]}</Link>
      ))}
    </nav>
  );
}
