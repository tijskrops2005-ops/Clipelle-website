"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  LayoutDashboard,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type NavItem = { href: string; label: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new", label: "New video", icon: Plus },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-control bg-ink text-surface text-sm font-bold"
        >
          {config.productName.charAt(0)}
        </span>
        <span className="text-base font-semibold tracking-tight text-ink">
          {config.productName}
        </span>
      </div>

      {/* Primary action — always the most prominent thing in the sidebar */}
      <div className="px-4 pb-4">
        <Button href="/new" variant="accent" className="w-full">
          <Plus className="size-4" aria-hidden />
          Create new video
        </Button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-ink/5 text-ink"
                  : "text-muted hover:bg-ink/5 hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-5 py-4 text-xs text-muted">
        Vmake · HeyGen · VEED
      </div>
    </aside>
  );
}
