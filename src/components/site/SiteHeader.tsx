"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { menus, menusFor, type MenuItem, type MenuKey } from "./siteNav";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";
import { LogoFull, LogoLockup, LogoMark } from "@/components/Logo";

/**
 * Floating rounded top bar of the public site: Platform, Solutions, Resources and Company open
 * card menus (one or two columns), Pricing is a plain link; right: the account slot (server
 * rendered: Log in / Book a demo / main button, or Studio + account when signed in).
 * Below lg a hamburger opens a drawer with the same links as accordions.
 *
 * Menus open on hover with a short intent delay on devices with a real pointer, switch at once
 * between each other, and always open on click, Enter and Space. Escape closes and returns focus;
 * ArrowDown enters the panel, arrows walk the cards, Tab enters and leaves. Touch uses taps.
 */
const MENU_KEYS: MenuKey[] = menus.map((m) => m.key);
const HOVER_OPEN_MS = 140;
const HOVER_CLOSE_MS = 180;

export function SiteHeader({ account, locale = "en" }: { account: ReactNode; locale?: Locale }) {
  const pathname = usePathname();
  const t = dict(locale);
  const localized = menusFor(locale);
  const L = (p: string) => localizePath(p, locale);
  const [open, setOpen] = useState<MenuKey | null>(null);
  const [drawer, setDrawer] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<MenuKey, HTMLButtonElement | null>>>({});
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const focusFirstOnOpen = useRef(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const panelId = useId();
  const current = open ? localized.find((m) => m.key === open) ?? null : null;

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

  function onNavBlur(e: React.FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (next && (navRef.current?.contains(next) || panelRef.current?.contains(next))) return;
    setOpen(null);
  }

  const panelLinks = () => Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []);
  const afterMenus = () => navRef.current?.nextElementSibling as HTMLElement | null;

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

  const twoColumns = (current?.columns.length ?? 0) > 1;

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div ref={barRef} className="relative mx-auto max-w-6xl">
        <div className="flex h-14 items-center justify-between rounded-full bg-surface px-2 shadow-card sm:px-3">
          <div className="flex items-center gap-1">
            <button type="button" aria-label={t.header.menuOpen} aria-expanded={drawer} onClick={() => setDrawer(true)} className="focus-ring grid size-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-ink/5 lg:hidden">
              <Menu className="size-5" aria-hidden />
            </button>
            <Link href={L("/")} aria-label={config.productName} className="focus-ring ml-1 flex items-center rounded-control">
              <LogoFull priority className="hidden h-11 lg:block" />
              {/* Below lg the compact lockup; on a phone the bar is full, so only the icon. */}
              <span className="hidden sm:inline lg:hidden"><LogoLockup /></span>
              <span className="sm:hidden"><LogoMark /></span>
            </Link>
          </div>

          <nav aria-label={t.header.site} className="hidden items-center gap-1 lg:flex">
            <div ref={navRef} className="flex items-center gap-1" onBlur={onNavBlur}>
              {localized.map((m) => (
                <MenuButton
                  key={m.key}
                  ref={(el) => {
                    buttonRefs.current[m.key] = el;
                  }}
                  label={m.label}
                  open={open === m.key}
                  controls={panelId}
                  onToggle={() => {
                    clearTimers();
                    setOpen(open === m.key ? null : m.key);
                  }}
                  onKeyDown={(e) => onButtonKey(m.key, e)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen(m.key)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
                />
              ))}
            </div>
            <NavLink href={L("/pricing")} active={pathname === L("/pricing")}>{t.header.pricing}</NavLink>
          </nav>

          <div className="flex items-center gap-2 pr-1">
            <LanguageSwitch locale={locale} className="hidden md:inline-flex" />
            {account}
          </div>
        </div>

        {/* Card menus */}
        {current && (
          <div
            ref={panelRef}
            id={panelId}
            className={cn(
              "fold-in absolute left-1/2 top-[calc(100%+10px)] z-50 -translate-x-1/2 rounded-card bg-surface p-3 shadow-card-hover before:absolute before:inset-x-0 before:-top-3 before:h-3 before:content-['']",
              twoColumns ? "w-[min(880px,calc(100vw-2rem))]" : "w-[min(720px,calc(100vw-2rem))]",
            )}
            role="region"
            aria-label={current.label}
            onPointerEnter={(e) => e.pointerType === "mouse" && hoverStay()}
            onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
            onKeyDown={onPanelKey}
            onBlur={onNavBlur}
          >
            <div className={cn("grid gap-2", twoColumns ? "md:grid-cols-2" : "")}>
              {current.columns.map((col, i) => (
                <div key={col.title ?? i} className={cn(twoColumns && i > 0 && "md:border-l md:border-divider md:pl-2")}>
                  {col.title && <p className="label-mono px-4 pb-1 pt-2 text-muted">{col.title}</p>}
                  <ul className={cn("grid gap-1", !twoColumns && "sm:grid-cols-2")}>
                    {col.items.map((c) => (
                      <li key={c.href}>
                        <MenuCardLink card={c} onNavigate={closeAll} compact soonLabel={t.common.soon} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile drawer: stays mounted and slides (27 Oct 2026). */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} label="Menu" width="w-[min(22rem,88vw)]" className="overflow-y-auto px-5 py-5">
            <div className="flex items-center justify-between">
              <LogoLockup />
              <button type="button" aria-label={t.header.menuClose} onClick={() => setDrawer(false)} className="focus-ring grid size-10 place-items-center rounded-full text-ink hover:bg-ink/5">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {localized.map((m) => (
              <DrawerGroup key={m.key} title={m.label} cards={m.columns.flatMap((c) => c.items)} onNavigate={closeAll} defaultOpen={m.key === "platform"} soonLabel={t.common.soon} />
            ))}
            <nav aria-label={t.header.pages} className="mt-4 flex flex-col gap-1 border-t border-divider pt-4">
              <Link href={L("/pricing")} onClick={closeAll} className="focus-ring rounded-control px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-ink/5">{t.header.pricing}</Link>
              <Link href={L("/demo")} onClick={closeAll} className="focus-ring rounded-control px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-ink/5">{t.common.bookDemo}</Link>
              <Link href="/login" onClick={closeAll} className="focus-ring rounded-control px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-ink/5">{t.common.logIn}</Link>
              <div className="px-3 py-2"><LanguageSwitch locale={locale} /></div>
            </nav>
            <Button href="/signup" variant="accent" size="lg" className="mt-auto w-full" onClick={closeAll}>
              {t.common.startFree}
            </Button>
      </Drawer>
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

export function SoonBadge({ label = "Soon" }: { label?: string }) {
  return <span className="label-mono rounded-full bg-warning/15 px-2 py-0.5 text-warning">{label}</span>;
}

export function MenuCardLink({ card, onNavigate, compact, soonLabel }: { card: MenuItem; onNavigate?: () => void; compact?: boolean; soonLabel?: string }) {
  const Icon = card.icon;
  return (
    <Link href={card.href} onClick={onNavigate} className={cn("focus-ring group flex h-full gap-3 rounded-panel transition-colors duration-150 hover:bg-surface-muted", compact ? "items-start p-3" : "flex-col p-4")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {card.title}
          {card.soon && <SoonBadge label={soonLabel} />}
        </span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{card.text}</span>
      </span>
    </Link>
  );
}

function DrawerGroup({ title, cards, onNavigate, defaultOpen, soonLabel }: { title: string; cards: MenuItem[]; onNavigate: () => void; defaultOpen?: boolean; soonLabel?: string }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
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
              <span className="flex items-center gap-2 text-[15px] font-medium text-ink">
                {c.title}
                {c.soon && <SoonBadge label={soonLabel} />}
              </span>
              <span className="block text-[13px] text-muted">{c.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
