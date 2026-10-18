"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";
import { DemoModeBadge } from "@/components/DemoModeBadge";
import { isActivePath, navItems } from "@/components/nav";

/** Top bar with a hamburger that opens a left drawer holding the same links as the sidebar. */
export function MobileNav() {
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
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-control text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Brand />
        </div>
        <DemoModeBadge />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          {/* backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-ink/40"
          />
          {/* drawer */}
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-surface px-6 py-5 shadow-card-hover"
          >
            <div className="flex items-center justify-between">
              <Brand onClick={close} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="grid size-10 place-items-center rounded-control text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
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
                      "flex h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                      active ? "bg-surface-muted text-ink" : "text-muted hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <p className="label-mono mt-auto text-muted">Vmake · HeyGen · VEED</p>
          </div>
        </div>
      )}
    </>
  );
}
