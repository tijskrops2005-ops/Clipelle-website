import Link from "next/link";
import { blogCategories } from "@/content/blogCategories";
import { orderedPosts, topTags } from "@/lib/blog";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { SectionIntro } from "@/components/site/SectionIntro";
import { BlogCard } from "@/components/site/BlogCard";
import { FinalCta } from "@/components/site/Persuasion";

/**
 * The blog overview, one page for /blog and /nl/blog (23 Nov 2026; the Dutch page used to be a bare
 * list): three featured articles, category chips, every article, the most used tags, the closing
 * band. The articles themselves are English; the Dutch page says so. Translation articles lead while
 * ads are switched off (`orderedPosts`).
 */
export function BlogIndex({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  const b = t.blog;
  const posts = orderedPosts();
  const featured = posts.slice(0, 3);
  const rest = posts.slice(3);
  const tags = topTags(12);
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <div>
        <SectionIntro eyebrow={b.eyebrow} title={b.title} text={b.text} />
        {locale !== "en" && <p className="mt-3 text-center text-[13px] text-muted">{t.common.articlesEnglish}</p>}
      </div>
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
            <section aria-label={b.allArticles} className="space-y-6">
              <h2 className="text-title">{b.allArticles}</h2>
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
        <section aria-label={b.tags} className="space-y-3">
          <p className="label-mono text-muted">{b.tags}</p>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <Link href={`/blog/tag/${encodeURIComponent(tag)}`} className="focus-ring inline-flex rounded-full bg-surface px-3 py-1.5 text-[13px] text-ink shadow-card hover:bg-surface-muted">#{tag}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
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
