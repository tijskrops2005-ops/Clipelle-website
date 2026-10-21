"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type Variant = "demo" | "contact";

/**
 * Book-a-demo / contact form. Posts to /api/demo-requests with a honeypot field ("website")
 * that humans never see; the server rate-limits per address and stores the request.
 */
export function DemoRequestForm({ variant }: { variant: Variant }) {
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
      if (!r.ok) throw new Error(json.error ?? "Could not send your request.");
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not send your request.");
    }
  }

  if (state === "done") {
    return (
      <div className="mx-auto max-w-xl rounded-card bg-surface p-10 text-center shadow-card">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success"><CheckCircle2 className="size-6" aria-hidden /></span>
        <h2 className="mt-5 text-title">Thanks, we have it</h2>
        <p className="mt-2 text-[15px] text-muted">{variant === "demo" ? "We reply by e-mail within two working days with a time, or with a sample if that is faster." : "We reply by e-mail within two working days."}</p>
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
        <Field id="name" label="Name">
          <Input id="name" name="name" required autoComplete="name" />
        </Field>
        <Field id="email" label="E-mail">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
      </div>
      <Field id="company" label="Company or shop" optional>
        <Input id="company" name="company" autoComplete="organization" />
      </Field>
      {variant === "demo" && (
        <Field id="goal" label="What do you want to make?" hint="Ads from product photos, translations, or both. How many a month?">
          <Input id="goal" name="goal" placeholder="e.g. 20 product ads a month in Dutch and German" />
        </Field>
      )}
      <Field id="message" label="Message" optional={variant === "demo"}>
        <Textarea id="message" name="message" placeholder={variant === "demo" ? "Anything we should know before we talk." : "How can we help?"} required={variant === "contact"} />
      </Field>
      {error && (
        <p role="alert" className="text-[13px] text-danger">{error}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">We use this only to answer you. See the privacy statement.</p>
        <Button type="submit" variant="accent" size="lg" disabled={state === "sending"}>
          {state === "sending" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}
          {variant === "demo" ? "Request a demo" : "Send"}
        </Button>
      </div>
    </form>
  );
}
