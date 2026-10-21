"use client";

import { config } from "@/lib/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { isActivePath, navItems } from "@/components/nav";

/** Desktop navigation: sits on the page background, only the active item is a white card. */
export type ShellUser = { email: string; name?: string; credits: number | null; workspace: { id: string; name: string; kind: string; role: string }; workspaces: { id: string; name: string; kind: string; role: string }[] } | null;

export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-66 shrink-0 flex-col px-6 py-7">
      <div className="px-1">
        <Brand />
      </div>

      {/* Primary action: always the most prominent thing in the sidebar */}
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
                "focus-ring group flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150",
                active ? "bg-surface text-ink shadow-card" : "text-muted hover:bg-ink/5 hover:text-ink",
              )}
            >
              <Icon className={cn("size-[18px] transition-colors duration-150", active ? "text-accent" : "text-muted group-hover:text-ink")} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        {user && <WorkspaceSwitcher current={user.workspace} workspaces={user.workspaces} />}
        {user && <UserMenu email={user.email} name={user.name} credits={user.credits} />}
        <p className="px-1 text-[13px] leading-relaxed text-muted">{config.tagline}</p>
      </div>
    </aside>
  );
}
