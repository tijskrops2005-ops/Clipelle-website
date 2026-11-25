"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Bot, LifeBuoy, Mail, MessageCircle, MessagesSquare, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supportChannels, type SupportChannel } from "@/lib/support";

/** Opens the support assistant (the drawer listens for it). */
export const OPEN_ASSISTANT_EVENT = "clipelle:open-assistant";

const ICONS: Record<SupportChannel["key"], LucideIcon> = { assistant: Bot, whatsapp: MessageCircle, email: Mail, faq: BookOpen, contact: MessagesSquare };

/**
 * One Support menu (25 Nov 2026, Tijs): the channels that are set up, fastest first (assistant,
 * WhatsApp, e-mail), then the questions and answers. As a pill in the top bar or a row in the sidebar.
 * Escape and a click outside close it; focus returns to the button.
 */
export function SupportMenu({ variant = "pill", onNavigate }: { variant?: "pill" | "row"; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const channels = supportChannels();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (c: SupportChannel) => {
    setOpen(false);
    onNavigate?.();
    if (c.key === "assistant") window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
  };

  return (
    <div ref={box} className={cn("relative", variant === "row" && "w-full")}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={
          variant === "pill"
            ? "focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-ink shadow-soft transition-colors duration-150 hover:bg-surface-muted"
            : "focus-ring group flex h-10 w-full items-center gap-3 rounded-control px-3 text-sm font-medium text-muted transition-[background-color,color] duration-150 hover:bg-ink/5 hover:text-ink"
        }
      >
        <LifeBuoy className={variant === "pill" ? "size-4" : "size-[18px] text-muted group-hover:text-ink"} aria-hidden />
        Support
      </button>
      {open && (
        <div id={id} role="menu" aria-label="Support" className={cn("fold-in absolute z-50 w-[300px] rounded-panel border border-border bg-surface p-1.5 shadow-card-hover", variant === "pill" ? "right-0 top-11" : "bottom-12 left-0")}>
          {channels.map((c) => {
            const Icon = ICONS[c.key];
            const body = (
              <>
                <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-surface-muted text-ink" aria-hidden><Icon className="size-4" /></span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-ink">{c.label}</span>
                  <span className="block truncate text-[12.5px] text-muted">{c.text}</span>
                </span>
              </>
            );
            const cls = "focus-ring flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-muted";
            if (!c.href) return <button key={c.key} type="button" role="menuitem" onClick={() => pick(c)} className={cls}>{body}</button>;
            if (c.external || c.href.startsWith("mailto:")) return <a key={c.key} role="menuitem" href={c.href} target={c.external ? "_blank" : undefined} rel={c.external ? "noopener noreferrer" : undefined} onClick={() => pick(c)} className={cls}>{body}</a>;
            return <Link key={c.key} role="menuitem" href={c.href} onClick={() => pick(c)} className={cls}>{body}</Link>;
          })}
        </div>
      )}
    </div>
  );
}
