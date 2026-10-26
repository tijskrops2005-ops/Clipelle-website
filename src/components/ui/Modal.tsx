"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A centred window on the native <dialog>: the browser traps focus, Escape closes it and focus
 * returns to the button that opened it. Opens only on a click (never by itself on page load).
 */
export function Modal({ open, onClose, title, description, children, footer, className }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn("m-auto w-[calc(100%-32px)] max-w-lg rounded-card bg-surface p-0 text-ink shadow-card-hover backdrop:bg-ink/45 open:fold-in", className)}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
            {description && <p className="mt-1.5 text-[14px] text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="focus-ring -mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-ink"><X className="size-4" aria-hidden /></button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </dialog>
  );
}
