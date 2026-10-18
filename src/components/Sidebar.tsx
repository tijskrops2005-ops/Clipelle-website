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
    <aside className="flex h-full w-66 shrink-0 flex-col px-6 py-7">
      {/* Brand (temporary name, see lib/config.ts) */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-[10px] bg-ink text-sm font-bold text-surface"
        >
          {config.productName.charAt(0)}
        </span>
        <span className="text-[17px] font-semibold tracking-tight text-ink">
          {config.productName}
        </span>
      </Link>

      {/* Primary action — always the most prominent thing in the sidebar */}
      <Button href="/new" variant="accent" size="lg" className="mt-8 w-full">
        <Plus className="size-[18px]" aria-hidden />
        Create new video
      </Button>

      {/* Navigation */}
      <nav aria-label="Main" className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-all",
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

      {/* Footer */}
      <p className="label-mono px-1 text-muted/80">Vmake · HeyGen · VEED</p>
    </aside>
  );
}
