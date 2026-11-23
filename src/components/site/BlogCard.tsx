import Link from "next/link";
import type { BlogPost } from "@/lib/blog";
import { formatDate } from "@/lib/utils";
import { BlogCover } from "./BlogCover";

/** One article tile: the cover, the title, the date and reading time (23 Nov 2026: no category line, no summary). */
export function BlogCard({ post, featured }: { post: Pick<BlogPost, "slug" | "title" | "summary" | "category" | "categoryLabel" | "date" | "readingMinutes"> & { soon?: boolean }; featured?: boolean }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <Link href={`/blog/${post.slug}`} className="focus-ring flex h-full flex-col">
        <BlogCover category={post.category} className="aspect-[3/1] sm:aspect-[16/9]" />
        <div className="flex flex-1 flex-col p-5">
          <h3 className={featured ? "text-[21px] font-semibold leading-tight text-ink" : "text-[17px] font-semibold leading-snug text-ink"}>{post.title}</h3>
          <p className="mt-auto pt-4 text-[13px] text-muted">
            {formatDate(post.date)} · {post.readingMinutes} min read
            {/* An article about a tool that is announced, not open (ads from a photo or a link while they are switched off). */}
            {post.soon && <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-[12px] text-ink">Tool coming soon</span>}
          </p>
        </div>
      </Link>
    </article>
  );
}
