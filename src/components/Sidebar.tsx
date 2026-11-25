"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Clock, LayoutGrid, Plus, Sparkles } from "lucide-react";
import { SupportMenu } from "@/components/SupportMenu";
import { ToolIcon } from "@/components/tools/ToolCard";
import { cn } from "@/lib/utils";
import { planByKey } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { isActivePath, navItems, adminNavItem, settingsNavItem, type NavItem } from "@/components/nav";
import { SOON_TOOLS, STUDIO_TOOLS, activeToolKey, type Tool } from "@/components/tools";
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

/**
 * The link groups, shared by the sidebar and the mobile drawer (25 Nov 2026, Tijs): Workspace (your
 * dashboard and projects), Create (All tools and every working tool, coloured by category) and Account
 * (settings and support).
 */
export function SidebarLinks({ isAdmin, onNavigate }: { isAdmin?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  // "Translate with a presenter" lives on the same path as "Translate a video": the query decides (28 Oct 2026).
  const activeTool = activeToolKey(pathname, search.toString(), STUDIO_TOOLS);
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      <GroupLabel first>Workspace</GroupLabel>
      {navItems.map((item) => (
        <NavRow key={item.href} item={item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
      ))}

      <GroupLabel>Create</GroupLabel>
      <NavRow item={{ href: "/tools", label: "All tools", icon: LayoutGrid }} active={isActivePath(pathname, "/tools")} onNavigate={onNavigate} />
      {STUDIO_TOOLS.map((t) => (
        <ToolRow key={t.key} tool={t} active={t.key === activeTool} onNavigate={onNavigate} />
      ))}
      <SoonGroup onNavigate={onNavigate} />

      <GroupLabel>Account</GroupLabel>
      <NavRow item={settingsNavItem} active={isActivePath(pathname, settingsNavItem.href)} onNavigate={onNavigate} />
      <SupportMenu variant="row" onNavigate={onNavigate} />
      {isAdmin && <NavRow item={adminNavItem} active={isActivePath(pathname, adminNavItem.href)} onNavigate={onNavigate} />}
    </nav>
  );
}

function GroupLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return <p className={cn("mb-1 px-3 text-[12px] font-medium text-muted", first ? "mt-0" : "mt-5")}>{children}</p>;
}

/**
 * What is coming, as one quiet row that opens (23 Nov 2026): six "Soon" rows used to be taller than
 * the real tools. Closed by default; the rows link to where a wish can be left.
 */
function SoonGroup({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  if (SOON_TOOLS.length === 0) return null;
  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring group flex min-h-9 w-full items-center gap-3 rounded-control px-3 py-1.5 text-left text-[13.5px] text-muted transition-[background-color,color] duration-150 hover:bg-ink/5 hover:text-ink"
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-ink-soft text-muted"><Clock className="size-3.5" aria-hidden /></span>
        <span className="min-w-0 flex-1 leading-tight">Coming soon</span>
        <span className="shrink-0 text-[12px] text-muted">{SOON_TOOLS.length}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 transition-transform duration-150", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="fold-in mt-0.5 flex flex-col gap-0.5">
          {SOON_TOOLS.map((t) => (
            <ToolRow key={t.key} tool={t} active={false} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
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
      <ToolIcon tool={tool} size="sm" />
      <span className="min-w-0 flex-1 leading-tight">{tool.label}</span>
      {tool.soon ? <span className="shrink-0 text-[11px] text-muted">Soon</span> : tool.isNew ? <span className="shrink-0 text-[11px] font-medium text-tone-enhance">New</span> : null}
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
        <span className="block text-[13px] font-medium text-champagne">{plan ? `${plan.name} plan` : "Your plan"}</span>
        <span className="block truncate text-[12.5px] text-champagne/70">{credits === null ? "Plans and credits" : `${credits.toLocaleString("en-US")} credits`}</span>
      </span>
      <span className="text-[12px] font-medium text-gold-light group-hover:underline">{paid ? "Manage" : "Upgrade"}</span>
    </Link>
  );
}
