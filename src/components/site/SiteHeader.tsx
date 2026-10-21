"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { platformMenu, resourcesMenu, type MenuCard } from "./siteNav";

/**
 * Floating rounded top bar of the public site: Platform and Resources open card menus,
 * Pricing and About are plain links; right: Log in, Book a demo and the main button.
 * Below lg a hamburger opens a drawer with the same links as accordions.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState<"platform" | "resources" | null>(null);
  const [drawer, setDrawer] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const closeAll = () => {
    setOpen(null);
    setDrawer(false);
  };

  // Close menus on outside click and on Escape; links close them on click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(null);
        setDrawer(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawer]);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div ref={barRef} className="relative mx-auto max-w-6xl">
        <div className="flex h-14 items-center justify-between rounded-full bg-surface px-2 shadow-card sm:px-3">
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)} className="focus-ring grid size-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-ink/5 lg:hidden">
              <Menu className="size-5" aria-hidden />
            </button>
            <Link href="/" className="focus-ring ml-1 flex items-center gap-2.5 rounded-control">
              <span aria-hidden className="grid size-8 place-items-center rounded-[10px] bg-ink text-sm font-bold text-surface">{config.productName.charAt(0)}</span>
              <span className="text-[17px] font-semibold tracking-tight text-ink">{config.productName}</span>
            </Link>
          </div>

          <nav aria-label="Site" className="hidden items-center gap-1 lg:flex">
            <MenuButton label="Platform" open={open === "platform"} onToggle={() => setOpen(open === "platform" ? null : "platform")} />
            <MenuButton label="Resources" open={open === "resources"} onToggle={() => setOpen(open === "resources" ? null : "resources")} />
            <NavLink href="/pricing" active={pathname === "/pricing"}>Pricing</NavLink>
            <NavLink href="/about" active={pathname === "/about"}>About</NavLink>
          </nav>

          <div className="flex items-center gap-2 pr-1">
            <Link href="/login" className="focus-ring hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink/5 sm:inline-flex">Log in</Link>
            <Button href="/demo" variant="secondary" size="md" className="hidden rounded-full lg:inline-flex">Book a demo</Button>
            <Button href="/signup" variant="accent" size="md">
              <span className="hidden sm:inline">Create your first ad free</span>
              <span className="sm:hidden">Start free</span>
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* Card menus */}
        {open && (
          <div className="fold-in absolute left-1/2 top-[calc(100%+10px)] z-50 w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 rounded-card bg-surface p-3 shadow-card-hover" role="region" aria-label={open === "platform" ? "Platform" : "Resources"}>
            <ul className="grid gap-2 sm:grid-cols-3">
              {(open === "platform" ? platformMenu : resourcesMenu).map((c) => (
                <li key={c.href}>
                  <MenuCardLink card={c} onNavigate={closeAll} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col overflow-y-auto rounded-r-card bg-surface px-5 py-5 shadow-card-hover">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-semibold tracking-tight text-ink">{config.productName}</span>
              <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="focus-ring grid size-10 place-items-center rounded-full text-ink hover:bg-ink/5">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <DrawerGroup title="Platform" cards={platformMenu} onNavigate={closeAll} />
            <DrawerGroup title="Resources" cards={resourcesMenu} onNavigate={closeAll} />
            <nav aria-label="Pages" className="mt-4 flex flex-col gap-1">
              <Link href="/pricing" onClick={closeAll} className="focus-ring rounded-control px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-ink/5">Pricing</Link>
              <Link href="/about" onClick={closeAll} className="focus-ring rounded-control px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-ink/5">About</Link>
              <Link href="/demo" onClick={closeAll} className="focus-ring rounded-control px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-ink/5">Book a demo</Link>
              <Link href="/login" onClick={closeAll} className="focus-ring rounded-control px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-ink/5">Log in</Link>
            </nav>
            <Button href="/signup" variant="accent" size="lg" className="mt-auto w-full" onClick={closeAll}>
              Create your first ad free
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuButton({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-expanded={open} aria-haspopup="true" onClick={onToggle} className={cn("focus-ring inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150", open ? "bg-ink/5 text-ink" : "text-muted hover:text-ink")}>
      {label}
      <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
    </button>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("focus-ring rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150", active ? "bg-ink/5 text-ink" : "text-muted hover:text-ink")}>
      {children}
    </Link>
  );
}

function MenuCardLink({ card, onNavigate }: { card: MenuCard; onNavigate: () => void }) {
  const Icon = card.icon;
  return (
    <Link href={card.href} onClick={onNavigate} className="focus-ring group flex h-full flex-col gap-3 rounded-panel p-4 transition-colors duration-150 hover:bg-surface-muted">
      <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-4" aria-hidden />
      </span>
      <span>
        <span className="block text-[15px] font-semibold text-ink">{card.title}</span>
        <span className="mt-1 block text-[13px] leading-relaxed text-muted">{card.text}</span>
      </span>
    </Link>
  );
}

function DrawerGroup({ title, cards, onNavigate }: { title: string; cards: MenuCard[]; onNavigate: () => void }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <div className="mt-4 border-t border-divider pt-4">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="focus-ring flex w-full items-center justify-between rounded-control px-3 py-2 text-left">
        <span className="label-mono text-muted">{title}</span>
        <ChevronDown className={cn("size-4 text-muted transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      <ul id={id} hidden={!open} className="mt-1 flex flex-col gap-1">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} onClick={onNavigate} className="focus-ring block rounded-control px-3 py-2.5 hover:bg-ink/5">
              <span className="block text-[15px] font-medium text-ink">{c.title}</span>
              <span className="block text-[13px] text-muted">{c.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
