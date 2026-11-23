"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Download, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { requestAccountDeletion } from "@/lib/data/settingsClient";
import { DELETION_GRACE_DAYS } from "@/lib/accountDeletion";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";

/**
 * The Danger zone of Settings → Profile (2 Nov 2026): download everything as one JSON file, or close
 * the account (removed after 30 days; signing in before then restores it).
 */
export function DangerZone() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onDelete(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestAccountDeletion(confirm.trim());
      router.push("/?account=closing");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }
  return (
    <SectionCard title="Your data and account">
      <div className="flex flex-col gap-3 rounded-panel border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-ink">Download your data</p>
          <p className="text-[13px] leading-relaxed text-muted">One file with everything in your account; video links work for 7 days.</p>
        </div>
        <Button href="/api/settings/export" variant="secondary" className="shrink-0" prefetch={false} download aria-disabled={config.demoMode || undefined}>
          <Download className="size-4" aria-hidden /> Download
        </Button>
      </div>
      <form onSubmit={onDelete} className="space-y-4 rounded-panel border border-danger/40 p-4">
        <div>
          <p className="text-[15px] font-semibold text-ink">Delete account</p>
          <p className="text-[13px] leading-relaxed text-muted">Removed after {DELETION_GRACE_DAYS} days; sign in before then to restore it.</p>
        </div>
        {error && <p role="alert" className="rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>}
        <Field id="confirm" label="Type your e-mail address to confirm">
          <Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" disabled={config.demoMode || busy} />
        </Field>
        <Button type="submit" variant="danger" disabled={busy || config.demoMode || !confirm.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Delete my account
        </Button>
      </form>
    </SectionCard>
  );
}
