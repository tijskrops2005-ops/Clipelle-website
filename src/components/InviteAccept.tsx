"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

type Info = { workspace: { name: string }; email: string; role: string; valid: boolean; signedInAs: string | null };

/** /invite/[token]: shows what the invitation is, asks to sign in with the right address, accepts on click. */
export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/invites/${encodeURIComponent(token)}`).then(async (r) => {
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "Invitation not found.");
      setInfo(b);
    }).catch((e: Error) => setError(e.message));
  }, [token]);
  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/invites/${encodeURIComponent(token)}`, { method: "POST" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "Could not accept.");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept.");
    } finally {
      setBusy(false);
    }
  }
  const next = `/invite/${encodeURIComponent(token)}`;
  return (
    <div className="mx-auto max-w-xl space-y-8 py-10">
      <PageHeader title="Workspace invitation" description={info ? `You are invited to join "${info.workspace.name}" as ${info.role}.` : "Checking the invitation…"} />
      <SectionCard title={info ? info.workspace.name : "Invitation"} description={info ? `Sent to ${info.email}` : ""}>
        {error && <p role="alert" className="text-[15px] text-danger">{error}</p>}
        {info && !info.valid && <p className="text-[15px] text-muted">This invitation has expired or was already used. Ask the owner for a new one.</p>}
        {info && info.valid && !info.signedInAs && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={`/login?next=${encodeURIComponent(next)}`} variant="accent">Sign in to accept</Button>
            <Button href={`/signup?next=${encodeURIComponent(next)}`} variant="secondary">Create an account</Button>
          </div>
        )}
        {info && info.valid && info.signedInAs && (
          <div className="space-y-3">
            {info.signedInAs.toLowerCase() !== info.email.toLowerCase() && <p className="text-[13px] text-warning">You are signed in as {info.signedInAs}; the invitation was sent to {info.email}. Accepting needs that address.</p>}
            <Button type="button" variant="accent" onClick={accept} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Join the workspace</Button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
