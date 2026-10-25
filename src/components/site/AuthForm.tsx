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
import { DemoBadge } from "@/components/DemoModeBadge";
import { AuthCard } from "@/components/auth/AuthShell";

type Mode = "login" | "signup";
type Method = "password" | "code";

/**
 * Sign in / sign up: Google first, then e-mail with a password or a one-time login code. Everything goes
 * through our /api/auth routes (rate limited); the session cookie is set by the server. The Google
 * button works once Google is switched on in Supabase and NEXT_PUBLIC_AUTH_GOOGLE=true; until then
 * it is hidden for visitors and shown with a setup note in development only.
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
  const [sent, setSent] = useState<"verify" | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const google = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";
  const showGoogleSetup = !google && process.env.NODE_ENV === "development";
  const withNext = (path: string) => `${path}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`;

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
      if (method === "code" && !codeSent) {
        await post("/api/auth/magic", { email, next });
        setCodeSent(true);
      } else if (method === "code") {
        const r = await post("/api/auth/code", { email, code: code.replace(/\s/g, ""), next });
        router.push(r.next ?? next);
        router.refresh();
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
    setError(null);
    const { supabaseAuthBrowser } = await import("@/lib/supabase/browser-auth");
    const { error: oauthError } = await supabaseAuthBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (oauthError) setError("Google sign-in did not start. Try again, or use your e-mail.");
  }

  if (config.demoMode) {
    return (
      <AuthCard title="No accounts in demo mode" text="The app runs as a demo user. Open the dashboard to try it; set NEXT_PUBLIC_DEMO_MODE=false for real sign-in.">
        <DemoBadge>Demo mode</DemoBadge>
        <Button href="/dashboard" variant="accent" size="lg" className="mt-5 w-full">Open the demo</Button>
      </AuthCard>
    );
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" text={`We sent a verification link to ${email}. Open it to activate your account; your free ad is unlocked once the address is verified.`}>
        <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent"><Mail className="size-6" aria-hidden /></span>
        <PartnerSignupConversion email={email} />
        <p className="mt-5 text-[13px] text-muted">Nothing arrived? Check spam, or <button type="button" className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink" onClick={() => setSent(null)}>try again</button>.</p>
      </AuthCard>
    );
  }

  const title = mode === "signup" ? "Create your account" : "Log in";
  const text = mode === "signup" ? "Start free: one 10-second ad after you verify your e-mail. No credit card needed." : "With Google, or with your e-mail address.";

  return (
    <AuthCard title={title} text={text}>
      {(google || showGoogleSetup) && (
        <>
          <button
            type="button"
            onClick={google ? onGoogle : undefined}
            disabled={!google}
            className="focus-ring flex h-12 w-full items-center justify-center gap-3 rounded-control border border-border bg-surface text-[15px] font-medium text-ink shadow-soft transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <GoogleMark />
            Continue with Google
          </button>
          {showGoogleSetup && (
            <p className="mt-2 rounded-control bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-ink/80">
              Development only: switch Google on in Supabase (Authentication → Providers), then set NEXT_PUBLIC_AUTH_GOOGLE=true. Visitors never see this button until then.
            </p>
          )}
          <div className="my-5 flex items-center gap-3 text-[12px] text-muted" aria-hidden>
            <span className="h-px flex-1 bg-divider" />
            or with e-mail
            <span className="h-px flex-1 bg-divider" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {mode === "signup" && method === "password" && (
          <Field id="name" label="Name" optional>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
        )}
        <Field id="email" label="E-mail address">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required readOnly={codeSent} className={codeSent ? "bg-surface-muted" : undefined} />
        </Field>
        {method === "code" && codeSent && (
          <div>
            <Field id="code" label="Login code" hint={`We sent a code to ${email}. It works once and expires after an hour.`}>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={12} placeholder="123456" autoFocus className="text-center font-mono text-[20px] tracking-[0.4em]" required />
            </Field>
            <div className="mt-2 flex justify-between text-[12.5px] text-muted">
              <button type="button" className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:text-ink" onClick={() => { setCodeSent(false); setCode(""); }}>Use a different e-mail</button>
              <button type="button" className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:text-ink" disabled={busy} onClick={() => { setError(null); void post("/api/auth/magic", { email, next }).catch((err: Error) => setError(err.message)); }}>Send a new code</button>
            </div>
          </div>
        )}
        {method === "password" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-ink">{mode === "signup" ? "Password (at least 8 characters)" : "Password"}</label>
              {mode === "login" && <Link href="/forgot-password" className="focus-ring rounded-control text-[12.5px] text-muted underline decoration-border underline-offset-4 hover:text-ink hover:decoration-ink">Forgot password?</Link>}
            </div>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} />
          </div>
        )}
        {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {method === "code" ? (codeSent ? "Log in with this code" : "E-mail me a login code") : mode === "signup" ? "Create account" : "Log in"}
        </Button>
        <button type="button" onClick={() => { setMethod(method === "password" ? "code" : "password"); setCodeSent(false); setCode(""); setError(null); }} className="focus-ring mx-auto block rounded-control text-[13px] text-muted underline decoration-border underline-offset-4 hover:text-ink hover:decoration-ink">
          {method === "password" ? "E-mail me a login code instead" : "Use a password instead"}
        </button>
      </form>

      <p className="mt-6 border-t border-divider pt-5 text-center text-[13.5px] text-muted">
        {mode === "login" ? (
          <>No account yet? <Link href={withNext("/signup")} className="focus-ring rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Start for free</Link></>
        ) : (
          <>Already have an account? <Link href={withNext("/login")} className="focus-ring rounded-control font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-ink">Log in</Link></>
        )}
      </p>
      {mode === "signup" && (
        <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
          By creating an account you accept the <Link href="/legal/terms" className="underline underline-offset-2">terms</Link> and the <Link href="/legal/privacy" className="underline underline-offset-2">privacy statement</Link>.
        </p>
      )}
    </AuthCard>
  );
}

/** The four-colour Google "G", as Google's sign-in branding asks for on a "Continue with Google" button. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
