/**
 * Blog categories (slug → label and one line). Articles live in src/content/blog/*.md and name one of these.
 * Translation comes first (23 Nov 2026): it is what the product does today; the chips follow this order.
 */
export const blogCategories = [
  { slug: "translation", label: "Translation and localization", text: "Translating videos with lip sync and choosing languages." },
  { slug: "captions-and-formats", label: "Captions and formats", text: "9:16, TikTok, Reels and Shorts, caption styles." },
  { slug: "product-video", label: "Product video", text: "Making short product videos and ads from a photo or a link." },
  { slug: "scripts-and-hooks", label: "Scripts and hooks", text: "Spoken hooks, scripts within a word limit, calls to action." },
  { slug: "costs-and-process", label: "Costs and process", text: "What a video costs, testing creatives, checklists, rights." },
] as const;

export type BlogCategorySlug = (typeof blogCategories)[number]["slug"];
export const categoryBySlug = (slug: string) => blogCategories.find((c) => c.slug === slug);
