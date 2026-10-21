import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const pages = [
  { href: "/docs/api", label: "API" },
  { href: "/docs/mcp", label: "MCP server" },
];

/** Docs pages: a small side menu with the sections, the content with anchored headings. */
export function DocsLayout({ current, sections, children }: { current: string; sections: { id: string; label: string }[]; children: ReactNode }) {
  return (
    <div className="grid gap-10 pt-12 sm:pt-16 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="label-mono text-muted">Docs</p>
        <ul className="mt-3 space-y-1">
          {pages.map((p) => (
            <li key={p.href}>
              <Link href={p.href} aria-current={p.href === current ? "page" : undefined} className={cn("focus-ring block rounded-control px-3 py-1.5 text-[15px]", p.href === current ? "bg-surface font-medium text-ink shadow-card" : "text-muted hover:text-ink")}>{p.label}</Link>
            </li>
          ))}
        </ul>
        <p className="label-mono mt-6 text-muted">On this page</p>
        <ul className="mt-3 space-y-1">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="focus-ring block rounded-control px-3 py-1 text-[14px] text-muted hover:text-ink">{s.label}</a>
            </li>
          ))}
        </ul>
      </aside>
      <article className="min-w-0 space-y-12 [&_h2]:scroll-mt-28 [&_h2]:text-title [&_h3]:mt-6 [&_h3]:text-[17px] [&_h3]:font-semibold [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-ink/85 [&_li]:text-[15px] [&_li]:text-ink/85">{children}</article>
    </div>
  );
}
