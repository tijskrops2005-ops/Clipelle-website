"use client";

import { config } from "@/lib/config";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { SidebarLinks, type ShellUser } from "@/components/Sidebar";

/** Top bar with a hamburger that opens a left drawer holding the same links as the sidebar. */
export function MobileNav({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const close = () => setOpen(false);

  // Escape closes the drawer; body scroll is locked while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

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

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          {/* backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />
          {/* drawer */}
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col rounded-r-card bg-surface px-6 py-5 shadow-card-hover"
          >
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
        </div>
      )}
    </>
  );
}
