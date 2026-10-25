"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { planByKey } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { isActivePath, navItems, adminNavItem, settingsNavItem, type NavItem } from "@/components/nav";
import { SOON_TOOLS, STUDIO_TOOLS, openToolSearch, type Tool } from "@/components/tools";
import { UnseenBadge } from "@/components/StatusWatcher";

export type ShellUser = { email: string; name?: string; credits: number | null; planKey?: string; workspace: { id: string; name: string; kind: string; role: string }; workspaces: { id: string; name: string; kind: string; role: string }[]; isAdmin?: boolean } | null;

/**
 * Desktop navigation (layout after getvidforge.com's dashboard, our own look): the main sections,
 * "All tools" (opens the tool search), the studio tools, what is coming soon, Settings, and a small
 * plan card above the account. It sits on the page background; only the active item is a white card.
 */
export function Sidebar({ user }: { user: ShellUser }) {
  return (
    <aside className="flex h-full w-66 shrink-0 flex-col py-6">
      <div className="px-7">
        <Brand />
      </div>

      {/* Primary action: always the most prominent thing in the sidebar */}
      <div className="px-6">
        <Button href="/new" variant="accent" size="lg" className="mt-6 w-full">
          <Plus className="size-[18px]" aria-hidden />
          Create new video
        </Button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-6 pb-4 [scrollbar-width:thin]">
        <SidebarLinks isAdmin={user?.isAdmin} />
      </div>

      <div className="space-y-2 border-t border-divider/70 px-6 pt-4">
        {user && <PlanChip planKey={user.planKey} credits={user.credits} />}
        {user && <WorkspaceSwitcher current={user.workspace} workspaces={user.workspaces} />}
        {user && <UserMenu email={user.email} name={user.name} credits={user.credits} />}
      </div>
    </aside>
  );
}

/** The link groups, shared by the sidebar and the mobile drawer. */
export function SidebarLinks({ isAdmin, onNavigate }: { isAdmin?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {navItems.map((item) => (
        <NavRow key={item.href} item={item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
      ))}
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          openToolSearch();
        }}
        className="focus-ring group flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium text-muted transition-[background-color,color] duration-150 hover:bg-ink/5 hover:text-ink"
      >
        <LayoutGrid className="size-[18px] text-muted transition-colors duration-150 group-hover:text-ink" aria-hidden />
        All tools
        <kbd className="label-mono ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">⌘K</kbd>
      </button>

      <p className="label-mono mb-1.5 mt-6 px-3 text-muted">Studio tools</p>
      {STUDIO_TOOLS.map((t) => (
        <ToolRow key={t.key} tool={t} active={isActivePath(pathname, t.href)} onNavigate={onNavigate} />
      ))}

      <p className="label-mono mb-1.5 mt-6 px-3 text-muted">Coming soon</p>
      {SOON_TOOLS.map((t) => (
        <ToolRow key={t.key} tool={t} active={false} onNavigate={onNavigate} />
      ))}

      <div className="mt-6 flex flex-col gap-0.5">
        <NavRow item={settingsNavItem} active={isActivePath(pathname, settingsNavItem.href)} onNavigate={onNavigate} />
        {isAdmin && <NavRow item={adminNavItem} active={isActivePath(pathname, adminNavItem.href)} onNavigate={onNavigate} />}
      </div>
    </nav>
  );
}

function NavRow({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring group flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150",
        active ? "bg-surface text-ink shadow-card" : "text-muted hover:bg-ink/5 hover:text-ink",
      )}
    >
      <Icon className={cn("size-[18px] transition-colors duration-150", active ? "text-accent" : "text-muted group-hover:text-ink")} aria-hidden />
      {item.label}
      <UnseenBadge href={item.href} />
    </Link>
  );
}

function ToolRow({ tool, active, onNavigate }: { tool: Tool; active: boolean; onNavigate?: () => void }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring group flex min-h-9 items-center gap-3 rounded-control px-3 py-1.5 text-[13.5px] transition-[background-color,color,box-shadow] duration-150",
        active ? "bg-surface font-medium text-ink shadow-card" : tool.soon ? "text-muted/80 hover:bg-ink/5 hover:text-ink" : "text-ink/80 hover:bg-ink/5 hover:text-ink",
      )}
    >
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-[7px] transition-colors duration-150", tool.soon ? "bg-ink-soft text-muted" : active ? "bg-accent text-white" : "bg-accent-soft text-accent")}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 leading-tight">{tool.label}</span>
      {tool.soon && <span className="label-mono shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted">Soon</span>}
    </Link>
  );
}

/** Plan and credits in one line, the way to more credits one click away. Gold on ink: the brand's premium moment. */
function PlanChip({ planKey, credits }: { planKey?: string; credits: number | null }) {
  const plan = planByKey(planKey);
  const paid = Boolean(plan && plan.monthlyUsd > 0);
  return (
    <Link href="/settings/billing" className="focus-ring group flex items-center gap-3 rounded-panel bg-ink px-3 py-2.5 text-champagne transition-transform duration-150 hover:-translate-y-px">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-gold-light"><Sparkles className="size-3.5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="label-mono block text-[10px] text-gold-light">{plan ? `${plan.name} plan` : "Your plan"}</span>
        <span className="block truncate text-[12.5px] text-champagne/80">{credits === null ? "Credits on the billing page" : `${credits.toLocaleString("en-US")} credits left`}</span>
      </span>
      <span className="text-[12px] font-medium text-gold-light group-hover:underline">{paid ? "Manage" : "Upgrade"}</span>
    </Link>
  );
}
