"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

async function post(path: string, body: Record<string, unknown>) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error ?? "Something went wrong.");
  return json;
}

/** "Forgot your password": sends the recovery mail; always confirms, so addresses cannot be probed. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/forgot", { email });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  if (done) return <p className="text-[15px] leading-relaxed text-muted">If an account exists for {email}, a reset link is on its way. Open it to choose a new password.</p>;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="email" label="E-mail">
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </Field>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
        Send reset link
      </Button>
    </form>
  );
}

/** After the recovery link: set a new password for the signed-in session. */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/password", { password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="password" label="New password" hint="At least 8 characters.">
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
      </Field>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
        Save password
      </Button>
    </form>
  );
}
