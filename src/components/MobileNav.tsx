"use client";

import { config } from "@/lib/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import type { ShellUser } from "@/components/Sidebar";
import { isActivePath, navItems } from "@/components/nav";

/** Top bar with a hamburger that opens a left drawer holding the same links as the sidebar. */
export function MobileNav({ user }: { user: ShellUser }) {
  const pathname = usePathname();
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

            <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors duration-150",
                      active ? "bg-surface-muted text-ink" : "text-muted hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    <Icon className={cn("size-[18px]", active ? "text-accent" : "text-muted")} aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <p className="mt-auto text-[13px] leading-relaxed text-muted">{config.tagline}</p>
          </div>
        </div>
      )}
    </>
  );
}
