import { brand } from "@/lib/brand";
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { marked, type Tokens } from "marked";
import { categoryBySlug } from "@/content/blogCategories";

/**
 * The blog: markdown files with a small front matter in src/content/blog/. Parsed once per process,
 * rendered to HTML with heading ids for the table of contents. Author is always "Clipelle Team".
 */
export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  summary: string;
  words: number;
  readingMinutes: number;
  html: string;
  toc: { id: string; text: string }[];
  /** Plain text of the body, for the search of related posts and the RSS description. */
  text: string;
};

export const BLOG_AUTHOR = brand.blogAuthor;
const DIR = path.join(process.cwd(), "src", "content", "blog");

export function slugify(s: string) {
  return s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function parseFrontMatter(raw: string): { meta: Record<string, string | string[]>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string | string[]> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    const v = value.trim();
    if (v.startsWith("[")) meta[key] = v.slice(1, -1).split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else meta[key] = v.replace(/^["']|["']$/g, "");
  }
  return { meta, body: m[2] };
}

function render(body: string) {
  const toc: { id: string; text: string }[] = [];
  const used = new Set<string>();
  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
    const text = tokens.map((t) => ("text" in t ? (t as { text: string }).text : "")).join("");
    let id = slugify(text) || `section-${toc.length + 1}`;
    while (used.has(id)) id = `${id}-x`;
    used.add(id);
    if (depth === 2) toc.push({ id, text });
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };
  const html = marked.parse(body, { renderer, gfm: true, breaks: false }) as string;
  const text = body.replace(/```[\s\S]*?```/g, " ").replace(/[#*_>`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
  return { html, toc, text };
}

let cache: BlogPost[] | null = null;

export function allPosts(): BlogPost[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
  } catch {
    files = [];
  }
  const posts = files
    .map((file) => {
      const { meta, body } = parseFrontMatter(readFileSync(path.join(DIR, file), "utf8"));
      const slug = String(meta.slug ?? file.replace(/\.md$/, ""));
      const { html, toc, text } = render(body);
      const words = text.split(/\s+/).filter(Boolean).length;
      const category = String(meta.category ?? "product-video");
      return {
        slug,
        title: String(meta.title ?? slug),
        date: String(meta.date ?? "2026-10-21"),
        category,
        categoryLabel: categoryBySlug(category)?.label ?? category,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        summary: String(meta.summary ?? ""),
        words,
        readingMinutes: Math.max(1, Math.round(words / 220)),
        html,
        toc,
        text,
      } satisfies BlogPost;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  cache = posts;
  return posts;
}

export const postBySlug = (slug: string) => allPosts().find((p) => p.slug === slug) ?? null;
export const postsByCategory = (category: string) => allPosts().filter((p) => p.category === category);
export const postsByTag = (tag: string) => allPosts().filter((p) => p.tags.includes(tag));
export const allTags = () => Array.from(new Set(allPosts().flatMap((p) => p.tags))).sort();

/** Same category first, then shared tags, newest first; never the post itself. */
export function relatedPosts(post: BlogPost, n = 3): BlogPost[] {
  const score = (p: BlogPost) => (p.category === post.category ? 2 : 0) + p.tags.filter((t) => post.tags.includes(t)).length;
  return allPosts()
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || b.p.date.localeCompare(a.p.date))
    .slice(0, n)
    .map((x) => x.p);
}

/** Splits rendered HTML before the n-th h2, so a CTA block can sit in the middle of an article. */
export function splitAtHeading(html: string, nth: number): [string, string] {
  const re = /<h2 /g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    count += 1;
    if (count === nth) return [html.slice(0, m.index), html.slice(m.index)];
  }
  return [html, ""];
}
