import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FinalCta } from "@/components/site/Persuasion";

const pages = [
  { href: "/docs/api", label: "API" },
  { href: "/docs/mcp", label: "MCP server" },
];

/**
 * Docs pages: a small side menu with the sections, the content with anchored headings, and the
 * site's closing band at content width. On phones the two pages are a pill row and "On this page"
 * folds away (23 Nov 2026), so the title is the first thing on screen instead of two lists.
 */
export function DocsLayout({ current, sections, children }: { current: string; sections: { id: string; label: string }[]; children: ReactNode }) {
  const sectionLinks = (
    <ul className="mt-3 space-y-1">
      {sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="focus-ring block rounded-control px-3 py-1 text-[14px] text-muted hover:text-ink">{s.label}</a>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <div className="grid gap-8 pt-12 sm:pt-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="hidden text-[13px] font-medium text-ink lg:block">Docs</p>
          <ul className="flex gap-2 lg:mt-3 lg:block lg:space-y-1">
            {pages.map((p) => (
              <li key={p.href}>
                <Link href={p.href} aria-current={p.href === current ? "page" : undefined} className={cn("focus-ring block rounded-control px-3 py-1.5 text-[15px]", p.href === current ? "bg-surface font-medium text-ink shadow-card" : "text-muted hover:text-ink")}>{p.label}</Link>
              </li>
            ))}
          </ul>
          <details className="group mt-4 rounded-control bg-surface shadow-card lg:hidden">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between rounded-control px-3 py-2.5 text-[14px] font-medium text-ink [&::-webkit-details-marker]:hidden">
              On this page
              <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="px-1 pb-2">{sectionLinks}</div>
          </details>
          <div className="hidden lg:block">
            <p className="mt-6 text-[13px] font-medium text-ink">On this page</p>
            {sectionLinks}
          </div>
        </aside>
        <article className="min-w-0 space-y-12 [&_h2]:scroll-mt-28 [&_h2]:text-title [&_h3]:mt-6 [&_h3]:text-[17px] [&_h3]:font-semibold [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-ink/85 [&_li]:text-[15px] [&_li]:text-ink/85">{children}</article>
      </div>
      <div className="mt-24 sm:mt-32"><FinalCta /></div>
    </>
  );
}

/** The one "coming soon" note on the docs pages (the ad endpoint and the ad tool while ads are switched off). */
export function SoonCallout({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[12px] border border-warning/30 bg-warning/5 px-4 py-3 !text-[14px] !text-ink">
      <strong className="font-semibold">Coming soon.</strong> {children}
    </p>
  );
}
