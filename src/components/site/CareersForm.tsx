"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

/** Open application: name, e-mail, area, link, message. Stored, nothing else. */
export function CareersForm() {
  const [v, setV] = useState({ name: "", email: "", area: "", link: "", message: "", website: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [stored, setStored] = useState(true);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      const r = await fetch("/api/careers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "Could not send your message.");
      setStored(body.stored !== false);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 text-[15px] text-ink">
        <Check className="size-5 text-success" aria-hidden />
        {stored ? "Thanks. We read every message and reply by e-mail." : config.demoMode ? "Demo mode: your message was not stored." : "Thanks."}
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="c-name" label="Name"><Input id="c-name" value={v.name} onChange={set("name")} required maxLength={120} /></Field>
        <Field id="c-email" label="E-mail"><Input id="c-email" type="email" value={v.email} onChange={set("email")} required maxLength={200} /></Field>
        <Field id="c-area" label="What you do" optional hint="Engineering, design, growth, support, something else."><Input id="c-area" value={v.area} onChange={set("area")} maxLength={120} /></Field>
        <Field id="c-link" label="Link" optional hint="Portfolio, profile or work you are proud of."><Input id="c-link" type="url" value={v.link} onChange={set("link")} maxLength={300} /></Field>
      </div>
      <Field id="c-message" label="Message" hint="Why Reelay, and what you would want to work on."><Textarea id="c-message" value={v.message} onChange={set("message")} required minLength={10} maxLength={4000} rows={5} /></Field>
      <input type="text" name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="primary" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Send
      </Button>
    </form>
  );
}
