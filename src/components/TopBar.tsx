"use client";

import Link from "next/link";
import { Bell, Coins, Search } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { SupportMenu } from "@/components/SupportMenu";
import { useUnseenCount } from "@/lib/notificationStore";
import { openToolSearch } from "@/components/tools";

export type TopBarProps = {
  /** The balance (what a credit is lives on Billing, 23 Nov 2026). */
  credits?: { balance: number; approx?: string } | null;
  user?: { email: string; name?: string; credits: number | null } | null;
};

/**
 * Desktop top bar (25 Nov 2026, Tijs, after splister.com/app): Support and search on the left; the
 * credits, the bell for finished or stopped videos and the account as pills on the right. White, one
 * thin line underneath. Below lg the floating mobile bar takes over.
 */
export function TopBar({ credits, user }: TopBarProps) {
  const unseen = useUnseenCount();
  return (
    <div className="sticky top-0 z-30 border-b border-divider bg-surface/95 backdrop-saturate-150">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-6 xl:px-8">
        <div className="flex items-center gap-2">
          <SupportMenu />
          <button
            type="button"
            onClick={openToolSearch}
            className="focus-ring flex h-9 w-56 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-left text-[13px] text-muted transition-colors duration-150 hover:text-ink"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1 truncate whitespace-nowrap">Search tools and projects</span>
            <kbd className="label-mono rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {credits && (
            <Link href="/app/settings/billing" className="focus-ring inline-flex h-9 items-center gap-2 rounded-full bg-accent-soft px-3.5 text-[13px] font-semibold text-accent transition-colors duration-150 hover:bg-accent/15" title="Your credits; buy more in Billing">
              <Coins className="size-4" aria-hidden />
              <span className="tabular-nums">{credits.balance.toLocaleString("en-US")} credits</span>
            </Link>
          )}
          <Link
            href="/app/projects"
            aria-label={unseen > 0 ? `${unseen} videos finished or stopped since your last visit` : "No new updates"}
            className="focus-ring relative grid size-9 place-items-center rounded-full border border-border bg-surface text-ink transition-colors duration-150 hover:bg-surface-muted"
          >
            <Bell className="size-4" aria-hidden />
            {unseen > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">{unseen}</span>}
          </Link>
          {user && <UserMenu email={user.email} name={user.name} credits={user.credits} variant="pill" />}
        </div>
      </div>
    </div>
  );
}
