"use client";

import { config } from "@/lib/config";
import Link from "next/link";
import { useId, useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { SidebarLinks, type ShellUser } from "@/components/Sidebar";

/** Top bar with a hamburger that opens a left drawer holding the same links as the sidebar. */
export function MobileNav({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const close = () => setOpen(false);

  return (
    <>
      {/* Floating rounded bar: menu, brand, the main action as a round accent button */}
      <div className="sticky top-0 z-40 px-3 pt-3">
        <div className="flex h-14 items-center justify-between gap-2 rounded-full bg-surface px-2 shadow-card">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen(true)}
              className="focus-ring grid size-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-ink/5"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <Brand />
          </div>
          <div className="flex items-center gap-2 pr-1">
            {user && <UserMenu email={user.email} name={user.name} credits={user.credits} compact />}
            <Link href="/new" aria-label="Create new video" className="focus-ring grid size-10 place-items-center rounded-full bg-accent text-white shadow-accent transition-colors duration-150 hover:bg-accent-hover">
              <Plus className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {/* The drawer stays mounted and slides (27 Oct 2026); closed it is inert. */}
      <Drawer open={open} onClose={close} label="Menu" className="px-6 py-5">
          <div id={panelId} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <Brand onClick={close} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="focus-ring grid size-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-ink/5"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <Button href="/new" variant="accent" size="lg" className="mt-8 w-full" onClick={close}>
              <Plus className="size-[18px]" aria-hidden />
              Create new video
            </Button>

            <div className="-mx-2 mt-5 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              <SidebarLinks isAdmin={user?.isAdmin} onNavigate={close} />
            </div>

            <p className="pt-3 text-[13px] leading-relaxed text-muted">{config.tagline}</p>
          </div>
      </Drawer>
    </>
  );
}
