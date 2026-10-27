import type { MetadataRoute } from "next";
import { allPosts, allTags } from "@/lib/blog";
import { blogCategories } from "@/content/blogCategories";
import { listedGuides } from "@/content/guides";
import { absoluteUrl } from "@/lib/site";
import { menus } from "@/components/site/siteNav";
import { isSitePath, localizePath, LOCALES } from "@/lib/i18n";

/** Every public page. App pages, auth pages and dev tools are left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const fixed = ["/", "/pricing", "/examples", "/about", "/demo", "/contact", "/blog", "/resources", "/resources/guides", "/resources/faq", "/resources/changelog", "/customers", "/partners", "/careers", "/trust", "/press", "/docs/api", "/docs/mcp", "/legal/terms", "/legal/privacy", "/legal/cookies", "/legal/affiliate-terms", "/legal/data", "/services/done-for-you"];
  // Announced ("soon") pages stay out of the sitemap until they are real.
  const menuPages = menus.flatMap((m) => m.columns.flatMap((c) => c.items.filter((i) => !i.soon).map((i) => i.href))).filter((h) => h.startsWith("/") && !h.startsWith("/new"));
  const pages = Array.from(new Set([...fixed, ...menuPages]));
  // Marketing pages exist in every language; each entry carries hreflang alternates.
  const localized = pages.flatMap((p) =>
    (isSitePath(p) ? LOCALES : (["en"] as const)).map((locale) => ({
      url: absoluteUrl(localizePath(p, locale)),
      lastModified: now,
      changeFrequency: (p === "/" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: p === "/" ? 1 : 0.7,
      alternates: isSitePath(p) ? { languages: Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(localizePath(p, l))])) } : undefined,
    })),
  );
  return [
    ...localized,
    ...listedGuides.map((g) => ({ url: absoluteUrl(`/resources/guides/${g.slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...blogCategories.map((c) => ({ url: absoluteUrl(`/blog/category/${c.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...allTags().map((t) => ({ url: absoluteUrl(`/blog/tag/${encodeURIComponent(t)}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.3 })),
    ...allPosts().map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: new Date(p.date), changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
