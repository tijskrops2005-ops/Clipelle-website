"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { Honeypot } from "@/components/site/Honeypot";

/** Request form for the managed service: name, e-mail, company, what you sell, ads per month, message. Stored, nothing else. */
export function ServiceRequestForm({ locale = "en" }: { locale?: Locale }) {
  const f = dict(locale).servicePage.form;
  const [v, setV] = useState({ name: "", email: "", company: "", sells: "", adsPerMonth: "", message: "", website: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [stored, setStored] = useState(true);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      const r = await fetch("/api/service-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? f.error);
      setStored(body.stored !== false);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : f.error);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 text-[15px] text-ink">
        <Check className="size-5 text-success" aria-hidden />
        {stored ? f.thanks : config.demoMode ? f.demo : "OK"}
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="s-name" label={f.name}><Input id="s-name" value={v.name} onChange={set("name")} required maxLength={120} /></Field>
        <Field id="s-email" label={f.email}><Input id="s-email" type="email" value={v.email} onChange={set("email")} required maxLength={200} /></Field>
        <Field id="s-company" label={f.company} optional><Input id="s-company" value={v.company} onChange={set("company")} maxLength={200} /></Field>
        <Field id="s-sells" label={f.sells} optional hint={f.sellsHint}><Input id="s-sells" value={v.sells} onChange={set("sells")} maxLength={300} /></Field>
        <Field id="s-ads" label={f.ads} optional>
          <select id="s-ads" value={v.adsPerMonth} onChange={set("adsPerMonth")} className="focus-ring h-11 w-full rounded-control border border-border bg-surface px-3 text-[15px] text-ink">
            <option value="">{f.choose}</option>
            <option value="1-5">1 to 5</option>
            <option value="5-20">5 to 20</option>
            <option value="20-50">20 to 50</option>
            <option value="50+">{f.more}</option>
          </select>
        </Field>
      </div>
      <Field id="s-message" label={f.message} optional hint={f.messageHint}><Textarea id="s-message" value={v.message} onChange={set("message")} maxLength={4000} rows={4} /></Field>
      <Honeypot value={v.website} onChange={(website) => setV((p) => ({ ...p, website }))} />
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="primary" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {f.send}
      </Button>
    </form>
  );
}
