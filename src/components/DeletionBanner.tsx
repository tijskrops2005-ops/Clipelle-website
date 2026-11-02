"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { restoreAccount } from "@/lib/data/settingsClient";

/** Shown after signing in while the account is scheduled for deletion (2 Nov 2026): the date, and Restore. */
export function DeletionBanner({ deletionAt }: { deletionAt: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = new Date(deletionAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  async function restore() {
    setBusy(true);
    setError(null);
    try {
      await restoreAccount();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restore.");
      setBusy(false);
    }
  }
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 bg-danger px-4 py-2.5 text-[13.5px] text-white sm:px-6">
      <span className="flex items-center gap-2"><TriangleAlert className="size-4 shrink-0" aria-hidden />Your account is scheduled for deletion on {date}.{error ? ` ${error}` : ""}</span>
      <button type="button" onClick={restore} disabled={busy} className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-danger">
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        Restore
      </button>
    </div>
  );
}
