"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { useUnseenCount } from "@/lib/notificationStore";
import { navItems, settingsNavItem } from "@/components/nav";
import { SOON_TOOLS, STUDIO_TOOLS, activeToolKey, openToolSearch } from "@/components/tools";

/** Where you are: the active tool (path and query, 28 Oct 2026), else the longest matching link, for the top bar's left side. */
function sectionOf(pathname: string, search: string) {
  const tool = activeToolKey(pathname, search, STUDIO_TOOLS);
  if (tool) return STUDIO_TOOLS.find((t) => t.key === tool)!.label;
  const all = [...SOON_TOOLS, ...navItems, settingsNavItem, { href: "/new", label: "New video" }];
  const match = all.filter((i) => i.href !== "/" && (pathname === i.href || pathname.startsWith(`${i.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "";
}

/**
 * Desktop top bar of the app: the current section on the left, tool search (⌘K) and the bell for
 * videos that finished or stopped since your last visit on the right. Below lg the floating mobile
 * bar takes over.
 */
export function TopBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const unseen = useUnseenCount();
  return (
    <div className="sticky top-0 z-30 border-b border-divider/70 bg-bg/95">
      <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center justify-between gap-4 px-8 lg:px-10">
        <p className="truncate text-[13px] font-medium text-muted">{sectionOf(pathname, search.toString())}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openToolSearch}
            className="focus-ring flex h-9 w-64 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-left text-[13px] text-muted shadow-soft transition-colors duration-150 hover:text-ink"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1">Search tools and projects…</span>
            <kbd className="label-mono rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>
          <Link
            href="/projects"
            aria-label={unseen > 0 ? `${unseen} videos finished or stopped since your last visit` : "No new updates"}
            className="focus-ring relative grid size-9 place-items-center rounded-full border border-border bg-surface text-ink shadow-soft transition-colors duration-150 hover:bg-surface-muted"
          >
            <Bell className="size-4" aria-hidden />
            {unseen > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">{unseen}</span>}
          </Link>
        </div>
      </div>
    </div>
  );
}
