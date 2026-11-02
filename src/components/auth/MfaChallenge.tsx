"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabaseAuthBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

/**
 * The second step of signing in (2 Nov 2026): the six-digit code from the authenticator app, or a
 * recovery code when the phone is gone (that turns two-step verification off; the account enrols
 * again afterwards). The code is checked by the auth provider in the browser; the recovery code by
 * our server. On success the page goes where the link was heading.
 */
export function MfaChallenge({ next: nextProp, compact = false }: { next?: string; compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const wanted = nextProp ?? params.get("next");
  const next = wanted && wanted.startsWith("/") && !wanted.startsWith("//") ? wanted : "/dashboard";
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabaseAuthBrowser()
      .auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        const totp = data?.totp?.find((f) => f.status === "verified") ?? data?.totp?.[0];
        setFactorId(totp?.id ?? null);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = supabaseAuthBrowser();
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr || !ch) throw new Error(chErr?.message ?? "Could not start the check.");
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.replace(/\s/g, "") });
      if (vErr) throw new Error("That code is not right. Codes change every 30 seconds; try the current one.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onRecover(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/settings/mfa/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: recovery }) });
      const body = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(body.error ?? "That recovery code is not right.");
      await supabaseAuthBrowser().auth.refreshSession();
      router.push("/settings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {error && <p role="alert" className="rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>}
      {!useRecovery ? (
        <form onSubmit={onVerify} className="space-y-4">
          <Field id="totp" label="Code from your authenticator app" hint="Six digits, new every 30 seconds.">
            <Input id="totp" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} autoFocus />
          </Field>
          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy || code.replace(/\s/g, "").length < 6 || !factorId}>
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            Verify
          </Button>
          <button type="button" onClick={() => setUseRecovery(true)} className="focus-ring block w-full rounded-control text-center text-[13px] text-muted underline decoration-border underline-offset-4 hover:text-ink">
            Lost your phone? Use a recovery code
          </button>
        </form>
      ) : (
        <form onSubmit={onRecover} className="space-y-4">
          <Field id="recovery" label="Recovery code" hint="One of the codes you saved when you turned two-step verification on. It turns verification off; you can turn it on again in Settings.">
            <Input id="recovery" value={recovery} onChange={(e) => setRecovery(e.target.value)} autoComplete="off" placeholder="k7m2-p9qx-4n8t" autoFocus />
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || recovery.trim().length < 8}>
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            Use recovery code
          </Button>
          <button type="button" onClick={() => setUseRecovery(false)} className="focus-ring block w-full rounded-control text-center text-[13px] text-muted underline decoration-border underline-offset-4 hover:text-ink">
            Back to the app code
          </button>
        </form>
      )}
    </div>
  );
}
