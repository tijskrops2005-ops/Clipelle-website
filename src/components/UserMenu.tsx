"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { DemoModeBadge } from "@/components/DemoModeBadge";

/** Signed-in user in the app shell: name/e-mail, credits, Settings and Sign out. */
export function UserMenu({ email, name, credits, compact }: { email: string; name?: string; credits?: number | null; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const initial = (name || email).charAt(0).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={cn("focus-ring flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors duration-150 hover:bg-ink/5", compact && "w-auto")}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-surface" aria-hidden>{initial}</span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{name || email}</span>
            <span className="block truncate text-[13px] text-muted">{credits === null || credits === undefined ? email : `${credits.toLocaleString("en-US")} credits`}</span>
          </span>
        )}
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      <div id={id} hidden={!open} className={cn("fold-in absolute z-50 w-60 rounded-card bg-surface p-2 shadow-card-hover", compact ? "right-0 top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)] left-0")}>
        <p className="truncate px-3 pb-2 pt-1 text-[13px] text-muted">{email}</p>
        {credits !== null && credits !== undefined && (
          <Link href="/settings/usage" onClick={() => setOpen(false)} className="focus-ring flex items-center justify-between rounded-control px-3 py-2 text-sm text-ink hover:bg-ink/5">
            Credits <span className="font-medium">{credits.toLocaleString("en-US")}</span>
          </Link>
        )}
        <Link href="/settings" onClick={() => setOpen(false)} className="focus-ring flex items-center gap-2 rounded-control px-3 py-2 text-sm text-ink hover:bg-ink/5"><Settings className="size-4" aria-hidden /> Settings</Link>
        {config.demoMode ? (
          <p className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted"><UserRound className="size-4" aria-hidden /> Demo user</p>
        ) : (
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="focus-ring flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-ink hover:bg-ink/5"><LogOut className="size-4" aria-hidden /> Sign out</button>
          </form>
        )}
        <div className="px-3 pt-2"><DemoModeBadge /></div>
      </div>
    </div>
  );
}
