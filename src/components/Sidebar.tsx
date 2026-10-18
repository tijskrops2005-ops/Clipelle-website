"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { isActivePath, navItems } from "@/components/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-66 shrink-0 flex-col px-6 py-7">
      <div className="px-1">
        <Brand />
      </div>

      {/* Primary action — always the most prominent thing in the sidebar */}
      <Button href="/new" variant="accent" size="lg" className="mt-8 w-full">
        <Plus className="size-[18px]" aria-hidden />
        Create new video
      </Button>

      <nav aria-label="Main" className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                active
                  ? "bg-surface text-ink shadow-card"
                  : "text-muted hover:bg-ink/5 hover:text-ink",
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="label-mono px-1 text-muted">Vmake · HeyGen · VEED</p>
    </aside>
  );
}
