"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { config } from "@/lib/config";
import { supabaseAuthBrowser } from "@/lib/supabase/browser";
import { getMfaState, mfaDisabled, mfaEnabled, mfaNewCodes, mfaRecover, type MfaState } from "@/lib/data/settingsClient";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SectionCard } from "@/components/ui/SectionCard";
import { Badge } from "@/components/ui/Badge";

/**
 * Two-step verification in Settings → Profile (2 Nov 2026): optional for everyone, required for
 * administrators. Turn on: scan the QR code, enter one code, save the recovery codes. Turn off: a
 * current code, or a recovery code. The authenticator itself lives at the auth provider; the
 * recovery codes are ours and are shown once.
 */
type Enrolling = { factorId: string; qr: string; secret: string };

export function TwoFactorSettings() {
  const [state, setState] = useState<MfaState | null>(null);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [offCode, setOffCode] = useState("");
  const [offRecovery, setOffRecovery] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (config.demoMode) return;
    let alive = true;
    getMfaState().then((s) => alive && setState(s)).catch((e: Error) => alive && setMsg({ tone: "error", text: e.message }));
    return () => {
      alive = false;
    };
  }, []);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  function startEnrol() {
    void run("enrol", async () => {
      const supabase = supabaseAuthBrowser();
      // A half-finished attempt from before is removed first; the provider allows one authenticator per name.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.totp ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Clipelle" });
      if (error || !data) throw new Error(error?.message ?? "Could not start. Try again in a moment.");
      setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    });
  }

  function confirmEnrol(e: FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    void run("confirm", async () => {
      const supabase = supabaseAuthBrowser();
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
      if (chErr || !ch) throw new Error(chErr?.message ?? "Could not start the check.");
      const { error } = await supabase.auth.mfa.verify({ factorId: enrolling.factorId, challengeId: ch.id, code: code.replace(/\s/g, "") });
      if (error) throw new Error("That code is not right. Codes change every 30 seconds; try the current one.");
      const fresh = await mfaEnabled();
      setCodes(fresh);
      setEnrolling(null);
      setCode("");
      setState((s) => ({ ...(s ?? { required: false }), enabled: true, recoveryLeft: fresh.length }));
      setMsg({ tone: "ok", text: "Two-step verification is on. Save your recovery codes somewhere safe." });
    });
  }

  function turnOff(e: FormEvent) {
    e.preventDefault();
    void run("off", async () => {
      if (offRecovery) {
        await mfaRecover(offCode);
      } else {
        const supabase = supabaseAuthBrowser();
        const { data: list } = await supabase.auth.mfa.listFactors();
        const factor = list?.totp?.find((f) => f.status === "verified");
        if (!factor) throw new Error("No authenticator found.");
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (chErr || !ch) throw new Error(chErr?.message ?? "Could not start the check.");
        const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: offCode.replace(/\s/g, "") });
        if (error) throw new Error("That code is not right.");
        const { error: unErr } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (unErr) throw new Error(unErr.message);
        await mfaDisabled();
      }
      await supabaseAuthBrowser().auth.refreshSession();
      setOffCode("");
      setCodes(null);
      setState((s) => ({ ...(s ?? { required: false }), enabled: false, recoveryLeft: 0 }));
      setMsg({ tone: "ok", text: "Two-step verification is off." });
    });
  }

  function newCodes() {
    void run("codes", async () => {
      const fresh = await mfaNewCodes();
      setCodes(fresh);
      setState((s) => (s ? { ...s, recoveryLeft: fresh.length } : s));
    });
  }

  const description = config.demoMode ? "Demo mode has no accounts, so there is nothing to verify." : state?.required ? "Required for administrators: the admin pages open only after a code from your authenticator app." : "A code from your authenticator app at every sign-in, next to your password.";

  return (
    <SectionCard title="Two-step verification" description={description} aside={state ? <Badge tone={state.enabled ? "success" : "warning"}>{state.enabled ? "On" : state.required ? "Required" : "Off"}</Badge> : undefined}>
      {msg && (
        <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-danger" : "rounded-chip bg-success/10 px-4 py-2.5 text-sm text-ink"}>
          {msg.text}
        </p>
      )}

      {codes && (
        <div className="rounded-panel border border-ink bg-surface p-4">
          <p className="text-[15px] font-semibold text-ink">Your recovery codes</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">Each works once and turns verification off when your phone is gone. They are shown only now: save them in your password manager or print them.</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[14px] text-ink sm:grid-cols-4">
            {codes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void navigator.clipboard?.writeText(codes.join("\n"))}>Copy</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCodes(null)}>I saved them</Button>
          </div>
        </div>
      )}

      {!config.demoMode && state && !state.enabled && !enrolling && (
        <Button type="button" variant="primary" onClick={startEnrol} disabled={busy !== null}>
          {busy === "enrol" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
          Turn on two-step verification
        </Button>
      )}

      {enrolling && (
        <form onSubmit={confirmEnrol} className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- the provider's QR code as a data URI */}
          <img src={enrolling.qr} alt="QR code for your authenticator app" width={168} height={168} className="rounded-panel border border-border bg-white p-2" />
          <div className="space-y-4">
            <p className="text-[14px] leading-relaxed text-ink">Scan the code with an authenticator app (Google Authenticator, 1Password, Authy…), then enter the six digits it shows.</p>
            <p className="text-[12.5px] text-muted">Cannot scan? Enter this key by hand: <span className="font-mono text-ink">{enrolling.secret}</span></p>
            <Field id="enrol-code" label="Code from the app">
              <Input id="enrol-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy !== null || code.replace(/\s/g, "").length < 6}>
                {busy === "confirm" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Confirm
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setEnrolling(null); setCode(""); }} disabled={busy !== null}>Cancel</Button>
            </div>
          </div>
        </form>
      )}

      {!config.demoMode && state?.enabled && (
        <div className="space-y-5">
          <p className="text-[13px] text-muted">{state.recoveryLeft} recovery {state.recoveryLeft === 1 ? "code" : "codes"} left. <button type="button" onClick={newCodes} disabled={busy !== null} className="focus-ring rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Make new codes</button></p>
          <form onSubmit={turnOff} className="space-y-3 rounded-panel border border-border p-4">
            <p className="text-[14px] font-medium text-ink">Turn off</p>
            <Field id="off-code" label={offRecovery ? "Recovery code" : "Code from your authenticator app"}>
              <Input id="off-code" value={offCode} onChange={(e) => setOffCode(e.target.value)} inputMode={offRecovery ? "text" : "numeric"} autoComplete="off" />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="danger" size="sm" disabled={busy !== null || offCode.trim().length < 6}>
                {busy === "off" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Turn off two-step verification
              </Button>
              <button type="button" onClick={() => { setOffRecovery((v) => !v); setOffCode(""); }} className="focus-ring rounded-control text-[13px] text-muted underline decoration-border underline-offset-4 hover:text-ink">
                {offRecovery ? "Use the app code instead" : "Use a recovery code instead"}
              </button>
            </div>
            {state.required && <p className="text-[12.5px] text-muted">Administrators lose access to the admin pages until it is on again.</p>}
          </form>
        </div>
      )}
    </SectionCard>
  );
}
