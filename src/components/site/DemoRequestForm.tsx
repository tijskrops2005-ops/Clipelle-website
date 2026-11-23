"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Honeypot } from "@/components/site/Honeypot";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

type Variant = "demo" | "contact";

/**
 * Book-a-demo / contact form. Posts to /api/demo-requests with a honeypot field ("website")
 * that humans never see; the server rate-limits per address and stores the request.
 */
export function DemoRequestForm({ variant, locale = "en" }: { variant: Variant; locale?: Locale }) {
  const f = dict(locale).forms;
  // The question about what to make follows the product: translations today, ads when they are switched on again.
  const goal = config.features.ads ? f.ads : f;
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
      <div className="mx-auto max-w-xl text-center">
        <CheckCircle2 className="mx-auto size-7 text-success" aria-hidden />
        <h2 className="mt-4 text-title">{f.thanks}</h2>
        <p className="mt-2 text-[15px] text-muted">{variant === "demo" ? f.thanksDemo : f.thanksText}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="mx-auto max-w-xl space-y-5">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label={f.name}>
          <Input id="name" name="name" required autoComplete="name" placeholder={f.namePlaceholder} />
        </Field>
        <Field id="email" label={f.email}>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder={f.emailPlaceholder} />
        </Field>
      </div>
      <Field id="company" label={f.company} optional optionalLabel={f.optional}>
        <Input id="company" name="company" autoComplete="organization" />
      </Field>
      {variant === "demo" && (
        <Field id="goal" label={goal.goal}>
          <Input id="goal" name="goal" placeholder={goal.goalPlaceholder} />
        </Field>
      )}
      <Field id="message" label={f.message} optional={variant === "demo"} optionalLabel={f.optional}>
        <Textarea id="message" name="message" placeholder={variant === "demo" ? f.demoPlaceholder : f.contactPlaceholder} required={variant === "contact"} />
      </Field>
      {error && (
        <p role="alert" className="text-[13px] text-danger">{error}</p>
      )}
      {/* The black primary, full width on phones, with the note under it (the page's one accent pill is in the closing band). */}
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
        <Button type="submit" variant="primary" size="lg" disabled={state === "sending"}>
          {state === "sending" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {variant === "demo" ? f.requestDemo : f.send}
        </Button>
        <p className="text-[13px] text-muted">{f.privacyNote} <Link href={localizePath("/legal/privacy", locale)} className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">{f.privacyLink}</Link>.</p>
      </div>
    </form>
  );
}
