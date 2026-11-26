"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Clock, LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { planByKey } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { SupportMenu } from "@/components/SupportMenu";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { accountNavItems, isActivePath, isSettingsActive, navItems, adminNavItem, settingsNavItem, type NavItem } from "@/components/nav";
import { SIDEBAR_TOOLS, SOON_TOOLS, STUDIO_TOOLS, activeToolKey, type Tool } from "@/components/tools";
import { UnseenBadge } from "@/components/StatusWatcher";

export type ShellUser = { email: string; name?: string; credits: number | null; planKey?: string; workspace: { id: string; name: string; kind: string; role: string }; workspaces: { id: string; name: string; kind: string; role: string }[]; isAdmin?: boolean } | null;

/**
 * Desktop navigation (25 Nov 2026, Tijs, after splister.com/app): an ink sidebar with the logo and the
 * plan, the one red "Create new video", then the links in quiet groups split by thin lines (your work,
 * the tools, the account). The account itself and the credits sit in the top bar.
 */
export function Sidebar({ user }: { user: ShellUser }) {
  const plan = planByKey(user?.planKey);
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-ink py-6 text-white">
      <div className="flex items-center justify-between gap-2 px-6">
        <Brand tone="light" />
      </div>
      <div className="mt-3 px-6">
        <Link href="/app/settings/billing" className="focus-ring inline-flex rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11.5px] font-medium text-gold-light transition-colors hover:bg-gold/20">
          {plan ? plan.name : "Free"}
        </Link>
      </div>

      <div className="px-4">
        <Button href="/app/new" variant="accent" size="lg" className="mt-6 w-full">
          <Plus className="size-[18px]" aria-hidden />
          Create new video
        </Button>
      </div>

      <div className="mt-7 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-2 [scrollbar-width:thin]">
        <SidebarLinks isAdmin={user?.isAdmin} fill />
      </div>

      {user && user.workspaces.length > 1 && (
        <div className="border-t border-white/10 px-4 pt-4">
          <WorkspaceSwitcher current={user.workspace} workspaces={user.workspaces} />
        </div>
      )}
    </aside>
  );
}

/** The link groups, shared by the sidebar and the mobile drawer (both ink). */
export function SidebarLinks({ isAdmin, onNavigate, fill }: { isAdmin?: boolean; onNavigate?: () => void; fill?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  // "Translate with a presenter" lives on the same path as "Translate a video": the query decides (28 Oct 2026).
  const activeTool = activeToolKey(pathname, search.toString(), STUDIO_TOOLS);
  return (
    // 26 Nov 2026 (Tijs: the menu sat cramped at the top with empty space below): roomier rows, and in the
    // sidebar the account group sits at the bottom so the column is used from top to bottom.
    <nav aria-label="Main" className={cn("flex flex-col gap-1", fill && "min-h-full flex-1")}>
      {navItems.map((item) => (
        <NavRow key={item.href} item={item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
      ))}

      <Divider />
      <NavRow item={{ href: "/app/tools", label: "All tools", icon: LayoutGrid }} active={isActivePath(pathname, "/app/tools") && !activeTool} onNavigate={onNavigate} />
      {SIDEBAR_TOOLS.map((t) => (
        <ToolRow key={t.key} tool={t} active={t.key === activeTool} onNavigate={onNavigate} />
      ))}
      <SoonGroup onNavigate={onNavigate} />

      <div className={cn("flex flex-col gap-0.5", fill && "mt-auto pt-4")}>
        <Divider />
        {/* The account group (26 Nov 2026, after splister.com/app): subscription, invoices, usage, feedback,
            affiliate, then the settings; shorter rows than the work above, so the whole column fits a laptop screen. */}
        {accountNavItems.map((item) => (
          <NavRow key={item.href} item={item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} compact />
        ))}
        <Divider />
        <NavRow item={settingsNavItem} active={isSettingsActive(pathname)} onNavigate={onNavigate} compact />
        <SupportMenu variant="row" onNavigate={onNavigate} />
        {isAdmin && <NavRow item={adminNavItem} active={isActivePath(pathname, adminNavItem.href)} onNavigate={onNavigate} compact />}
      </div>
    </nav>
  );
}

function Divider() {
  return <div className="mx-3 my-4 border-t border-white/10" aria-hidden />;
}

const rowBase = "focus-ring group flex h-11 items-center gap-3 rounded-[12px] px-3 text-[14.5px] transition-[background-color,color,box-shadow] duration-150";
const rowIdle = "text-white/65 hover:bg-white/[0.06] hover:text-white";
const rowActive = "bg-accent/15 font-medium text-white ring-1 ring-inset ring-accent/45";

/** What is coming, as one quiet row that opens; the rows link to where a wish can be left. */
function SoonGroup({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  if (SOON_TOOLS.length === 0) return null;
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn(rowBase, rowIdle, "w-full text-left")}>
        <Clock className="size-[18px] text-white/45" aria-hidden />
        <span className="min-w-0 flex-1">Coming soon</span>
        <span className="text-[12px] text-white/45">{SOON_TOOLS.length}</span>
        <ChevronDown className={cn("size-3.5 text-white/45 transition-transform duration-150", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="fold-in flex flex-col gap-0.5">
          {SOON_TOOLS.map((t) => (
            <ToolRow key={t.key} tool={t} active={false} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavRow({ item, active, onNavigate, compact }: { item: NavItem; active: boolean; onNavigate?: () => void; /** The account rows: a little shorter and quieter than the work rows. */ compact?: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(rowBase, compact && "h-9 text-[13.5px]", active ? rowActive : rowIdle)}>
      <Icon className={cn("transition-colors duration-150", compact ? "size-4" : "size-[18px]", active ? "text-accent-light" : "text-white/55 group-hover:text-white")} aria-hidden />
      {item.label}
      <UnseenBadge href={item.href} />
    </Link>
  );
}

function ToolRow({ tool, active, onNavigate }: { tool: Tool; active: boolean; onNavigate?: () => void }) {
  const Icon = tool.icon;
  return (
    <Link href={tool.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(rowBase, active ? rowActive : tool.soon ? "text-white/45 hover:bg-white/[0.06] hover:text-white" : rowIdle)}>
      <Icon className={cn("size-[18px] shrink-0 transition-colors duration-150", active ? "text-accent-light" : "text-white/55 group-hover:text-white")} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{tool.label}</span>
      {tool.soon ? <span className="shrink-0 text-[11px] text-white/45">Soon</span> : tool.isNew ? <span className="shrink-0 text-[11px] font-medium text-gold-light">New</span> : null}
    </Link>
  );
}
