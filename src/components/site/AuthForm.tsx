"use client";

import { PartnerSignupConversion } from "@/components/site/PartnerSignupConversion";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DemoBadge } from "@/components/DemoModeBadge";

type Mode = "login" | "signup";
type Method = "password" | "magic";

/**
 * Sign in / sign up with e-mail and password or a magic link. Everything goes through our
 * /api/auth routes (rate limited); the session cookie is set by the server. Google sign-in
 * appears only when NEXT_PUBLIC_AUTH_GOOGLE=true.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const urlError = params.get("error");
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(urlError);
  const [sent, setSent] = useState<"magic" | "verify" | null>(null);
  const google = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";

  async function post(path: string, body: Record<string, unknown>) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(json.error ?? "Something went wrong.");
    return json as { ok: true; next?: string; needsVerification?: boolean };
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (method === "magic") {
        await post("/api/auth/magic", { email, next });
        setSent("magic");
      } else if (mode === "signup") {
        const r = await post("/api/auth/signup", { email, password, name });
        if (r.needsVerification) setSent("verify");
        else router.push(next);
      } else {
        const r = await post("/api/auth/login", { email, password, next });
        router.push(r.next ?? next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const { supabaseAuthBrowser } = await import("@/lib/supabase/browser-auth");
    await supabaseAuthBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  }

  if (config.demoMode) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <DemoBadge>Demo mode</DemoBadge>
        <h2 className="mt-4 text-title">No accounts in demo mode</h2>
        <p className="mt-2 text-[15px] text-muted">The app runs as a demo user. Open the dashboard to try it; set NEXT_PUBLIC_DEMO_MODE=false for real sign-in.</p>
        <Button href="/dashboard" variant="primary" className="mt-6">Open the demo</Button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent-soft text-accent"><Mail className="size-6" aria-hidden /></span>
        <PartnerSignupConversion email={email} />
        <h2 className="mt-5 text-title">Check your inbox</h2>
        <p className="mt-2 text-[15px] text-muted">{sent === "magic" ? `We sent a sign-in link to ${email}. Open it on this device to continue.` : `We sent a verification link to ${email}. Open it to activate your account; your free ad is unlocked once the address is verified.`}</p>
        <p className="mt-6 text-[13px] text-muted">Nothing arrived? Check spam, or <button type="button" className="underline" onClick={() => setSent(null)}>try again</button>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-md space-y-5 rounded-card bg-surface p-6 shadow-card sm:p-8">
      <SegmentedControl label="Sign-in method" options={[{ key: "password", label: "Password" }, { key: "magic", label: "Magic link" }]} value={method} onChange={setMethod} className="w-full justify-center" />
      {mode === "signup" && method === "password" && (
        <Field id="name" label="Name" optional>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
      )}
      <Field id="email" label="E-mail">
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </Field>
      {method === "password" && (
        <Field id="password" label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} />
        </Field>
      )}
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
        {method === "magic" ? "Send me a link" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      {google && (
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={onGoogle}>
          Continue with Google
        </Button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
        {mode === "login" ? (
          <>
            <Link href="/forgot-password" className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">Forgot your password?</Link>
            <span>No account? <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">Create one</Link></span>
          </>
        ) : (
          <span>Already have an account? <Link href="/login" className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">Sign in</Link></span>
        )}
      </div>
      {mode === "signup" && <p className="text-[13px] leading-relaxed text-muted">By creating an account you accept the <Link href="/legal/terms" className="underline">terms</Link> and the <Link href="/legal/privacy" className="underline">privacy statement</Link>. One free 10-second ad after you verify your e-mail; no card needed.</p>}
    </form>
  );
}
