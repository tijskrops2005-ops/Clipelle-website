"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A side drawer for phones (27 Oct 2026): it stays mounted and slides in and out with transform
 * and opacity, so opening and closing is one smooth motion instead of a pop. Closed, it is `inert`
 * and hidden from assistive technology. Escape closes it; the page behind it stops scrolling without
 * the layout jumping (`scrollbar-gutter`); focus goes to the first focusable element on open and
 * back to the opener on close. Under "reduce motion" the transitions are off.
 */
export function Drawer({ open, onClose, label, width = "w-[min(20rem,85vw)]", className, children }: { open: boolean; onClose: () => void; label: string; width?: string; className?: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  // The latest onClose without re-running the open effect on every render.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "stable";
    // Focus the first control inside once the slide has started.
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>("a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])");
      first?.focus({ preventScroll: true });
    }, 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.gutter;
      const back = opener.current;
      if (back instanceof HTMLElement) back.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <div className={cn("fixed inset-0 z-50 lg:hidden", !open && "pointer-events-none")} role="presentation" aria-hidden={!open || undefined} inert={!open || undefined}>
      {/* backdrop */}
      <button type="button" aria-label="Close menu" onClick={onClose} tabIndex={-1} className={cn("absolute inset-0 bg-ink/40 transition-opacity duration-300 ease-out motion-reduce:transition-none", open ? "opacity-100" : "opacity-0")} />
      {/* panel */}
      <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className={cn("absolute inset-y-0 left-0 flex flex-col rounded-r-card bg-surface shadow-card-hover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none", width, open ? "translate-x-0" : "-translate-x-full", className)}>
        {children}
      </div>
    </div>
  );
}
