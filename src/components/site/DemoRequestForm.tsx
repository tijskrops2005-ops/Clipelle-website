"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";

type Variant = "demo" | "contact";

/**
 * Book-a-demo / contact form. Posts to /api/demo-requests with a honeypot field ("website")
 * that humans never see; the server rate-limits per address and stores the request.
 */
export function DemoRequestForm({ variant, locale = "en" }: { variant: Variant; locale?: Locale }) {
  const f = dict(locale).forms;
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = Object.fromEntries(data.entries());
    setState("sending");
    setError(null);
    try {
      const r = await fetch("/api/demo-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, kind: variant }) });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error ?? f.error);
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : f.error);
    }
  }

  if (state === "done") {
    return (
      <div className="mx-auto max-w-xl rounded-card bg-surface p-10 text-center shadow-card">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success"><CheckCircle2 className="size-6" aria-hidden /></span>
        <h2 className="mt-5 text-title">{f.thanks}</h2>
        <p className="mt-2 text-[15px] text-muted">{variant === "demo" ? f.thanksDemo : f.thanksText}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="mx-auto max-w-xl space-y-5 rounded-card bg-surface p-6 shadow-card sm:p-8">
      {/* Honeypot: hidden from people, filled by simple bots */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label={f.name}>
          <Input id="name" name="name" required autoComplete="name" />
        </Field>
        <Field id="email" label={f.email}>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
      </div>
      <Field id="company" label={f.company} optional>
        <Input id="company" name="company" autoComplete="organization" />
      </Field>
      {variant === "demo" && (
        <Field id="goal" label={f.goal} hint={f.goalHint}>
          <Input id="goal" name="goal" placeholder={f.goalPlaceholder} />
        </Field>
      )}
      <Field id="message" label={f.message} optional={variant === "demo"}>
        <Textarea id="message" name="message" placeholder={variant === "demo" ? f.demoPlaceholder : f.contactPlaceholder} required={variant === "contact"} />
      </Field>
      {error && (
        <p role="alert" className="text-[13px] text-danger">{error}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">We use this only to answer you. See the privacy statement.</p>
        <Button type="submit" variant="accent" size="lg" disabled={state === "sending"}>
          {state === "sending" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
          {variant === "demo" ? f.requestDemo : f.send}
        </Button>
      </div>
    </form>
  );
}
