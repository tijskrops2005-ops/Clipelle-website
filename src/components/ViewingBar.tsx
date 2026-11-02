"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import type { Viewing } from "@/lib/auth";

/**
 * The bar an administrator sees while viewing as a customer (2 Nov 2026): who, until when, and the
 * way out. Fixed at the top of the app; everything underneath is read-only (the proxy refuses writes).
 */
export function ViewingBar({ viewing }: { viewing: Viewing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const ends = new Date(viewing.expiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  async function exit() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/view/exit", { method: "POST" });
      const body = (await r.json().catch(() => ({}))) as { customerId?: string | null };
      router.push(body.customerId ? `/admin/customers/${body.customerId}` : "/admin/customers");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-ink px-4 py-2 text-[13px] text-surface sm:px-6">
      <span className="flex min-w-0 items-center gap-2">
        <Eye className="size-4 shrink-0 text-gold-light" aria-hidden />
        <span className="truncate">Viewing as <strong className="font-semibold">{viewing.customerName}</strong> · read-only · ends at {ends}</span>
      </span>
      <button type="button" onClick={exit} disabled={busy} className="focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-gold-light px-3.5 text-[13px] font-semibold text-ink transition-transform duration-150 hover:-translate-y-px">
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        Exit
      </button>
    </div>
  );
}
