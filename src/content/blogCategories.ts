/** Blog categories (slug → label and one line). Articles live in src/content/blog/*.md and name one of these. */
export const blogCategories = [
  { slug: "product-video", label: "Product video", text: "Making short product videos and ads from a photo or a link." },
  { slug: "scripts-and-hooks", label: "Scripts and hooks", text: "Spoken hooks, scripts within a word limit, calls to action." },
  { slug: "captions-and-formats", label: "Captions and formats", text: "9:16, TikTok, Reels and Shorts, caption styles." },
  { slug: "translation", label: "Translation and localization", text: "Translating videos with lipsync and choosing languages." },
  { slug: "costs-and-process", label: "Costs and process", text: "What a video costs, testing creatives, checklists, rights." },
] as const;

export type BlogCategorySlug = (typeof blogCategories)[number]["slug"];
export const categoryBySlug = (slug: string) => blogCategories.find((c) => c.slug === slug);
