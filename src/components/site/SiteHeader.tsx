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
type MenuKey = "platform" | "resources";
const MENU_KEYS: MenuKey[] = ["platform", "resources"];
/** Hover intent: a short pause before opening and before closing, so moving from the item to the panel never flickers. */
const HOVER_OPEN_MS = 140;
const HOVER_CLOSE_MS = 180;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuKey | null>(null);
  const [drawer, setDrawer] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<MenuKey, HTMLButtonElement | null>>({ platform: null, resources: null });
  const openTimer = useRef<number | null>(null);
  /** Set by the keyboard: once the panel is in the DOM, move focus to its first card. */
  const focusFirstOnOpen = useRef(false);
  const closeTimer = useRef<number | null>(null);
  /** Hover opens the menus only where a real pointer exists (mouse or trackpad); touch and the drawer use taps. */
  const [hoverCapable, setHoverCapable] = useState(false);
  const panelId = useId();

  const closeAll = () => {
    clearTimers();
    setOpen(null);
    setDrawer(false);
  };

  function clearTimers() {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }

  /** Pointer arrives on an item: cancel a pending close; switch at once when another menu is open, else open after a short pause. */
  function hoverOpen(key: MenuKey) {
    if (!hoverCapable) return;
    clearTimers();
    if (open && open !== key) {
      setOpen(key);
      return;
    }
    if (open === key) return;
    openTimer.current = window.setTimeout(() => setOpen(key), HOVER_OPEN_MS);
  }

  /** Pointer leaves the item or the panel: close after a short pause unless it arrives on the other part in time. */
  function hoverClose() {
    if (!hoverCapable) return;
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(null), HOVER_CLOSE_MS);
  }

  function hoverStay() {
    if (!hoverCapable) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  /** Focus leaves the whole menu area (Tab out): close. */
  function onNavBlur(e: React.FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (next && (navRef.current?.contains(next) || panelRef.current?.contains(next))) return;
    setOpen(null);
  }

  const panelLinks = () => Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []);
  /** The first focusable after the two menu buttons (the Pricing link), for Tab out of the panel. */
  const afterMenus = () => navRef.current?.nextElementSibling as HTMLElement | null;

  /** Arrow keys walk the cards; Home/End jump; Tab past the last card (or Shift+Tab before the first) leaves and closes. */
  function onPanelKey(e: React.KeyboardEvent) {
    const links = panelLinks();
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    const go = (n: number) => {
      e.preventDefault();
      links[(n + links.length) % links.length]?.focus();
    };
    if (e.key === "ArrowDown" || e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(links.length - 1);
    else if (e.key === "Tab" && !e.shiftKey && i === links.length - 1) {
      e.preventDefault();
      const cur = open;
      setOpen(null);
      (afterMenus() ?? (cur && buttonRefs.current[cur]))?.focus();
    } else if (e.key === "Tab" && e.shiftKey && i === 0) {
      e.preventDefault();
      const cur = open;
      setOpen(null);
      if (cur) buttonRefs.current[cur]?.focus();
    }
  }

  /** On the button: ArrowDown opens and moves into the panel; Tab on an open menu enters it; Enter and Space toggle natively (click). */
  function onButtonKey(key: MenuKey, e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey && open === key)) {
      e.preventDefault();
      clearTimers();
      focusFirstOnOpen.current = true;
      if (open === key) panelLinks()[0]?.focus();
      else setOpen(key);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = MENU_KEYS[(MENU_KEYS.indexOf(key) + (e.key === "ArrowRight" ? 1 : -1) + MENU_KEYS.length) % MENU_KEYS.length];
      buttonRefs.current[next]?.focus();
      if (open) setOpen(next);
    }
  }

  useEffect(() => {
    if (open && focusFirstOnOpen.current) panelRef.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
    focusFirstOnOpen.current = false;
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setHoverCapable(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Close menus on outside click and on Escape (focus back on the button); links close them on click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen((cur) => {
          if (cur) buttonRefs.current[cur]?.focus();
          return null;
        });
        setDrawer(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      clearTimers();
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
            <div ref={navRef} className="flex items-center gap-1" onBlur={onNavBlur}>
              {MENU_KEYS.map((key) => (
                <MenuButton
                  key={key}
                  ref={(el) => {
                    buttonRefs.current[key] = el;
                  }}
                  label={key === "platform" ? "Platform" : "Resources"}
                  open={open === key}
                  controls={panelId}
                  onToggle={() => {
                    clearTimers();
                    setOpen(open === key ? null : key);
                  }}
                  onKeyDown={(e) => onButtonKey(key, e)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen(key)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
                />
              ))}
            </div>
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
          <div
            ref={panelRef}
            id={panelId}
            // The pseudo-element bridges the 10 px gap under the bar, so the pointer never leaves the menu on its way down.
            className="fold-in absolute left-1/2 top-[calc(100%+10px)] z-50 w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 rounded-card bg-surface p-3 shadow-card-hover before:absolute before:inset-x-0 before:-top-3 before:h-3 before:content-['']"
            role="region"
            aria-label={open === "platform" ? "Platform" : "Resources"}
            onPointerEnter={(e) => e.pointerType === "mouse" && hoverStay()}
            onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
            onKeyDown={onPanelKey}
            onBlur={onNavBlur}
          >
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

type MenuButtonProps = {
  label: string;
  open: boolean;
  controls: string;
  onToggle: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onPointerEnter: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

/** Click, Enter and Space toggle; hover opens on pointer devices (handled by the parent); aria-expanded tells the state. */
function MenuButton({ ref, label, open, controls, onToggle, onKeyDown, onPointerEnter, onPointerLeave }: MenuButtonProps & { ref: React.Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-haspopup="true"
      aria-controls={open ? controls : undefined}
      onClick={onToggle}
      onKeyDown={onKeyDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={cn("focus-ring inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150", open ? "bg-ink/5 text-ink" : "text-muted hover:text-ink")}
    >
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
