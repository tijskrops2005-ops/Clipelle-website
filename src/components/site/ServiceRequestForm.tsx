"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

/** Request form for the managed service: name, e-mail, company, what you sell, ads per month, message. Stored, nothing else. */
export function ServiceRequestForm() {
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
      if (!r.ok) throw new Error(body.error ?? "Could not send your request.");
      setStored(body.stored !== false);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 text-[15px] text-ink">
        <Check className="size-5 text-success" aria-hidden />
        {stored ? "Thanks. We reply by e-mail within two working days to plan a call." : config.demoMode ? "Demo mode: your request was not stored." : "Thanks."}
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="s-name" label="Name"><Input id="s-name" value={v.name} onChange={set("name")} required maxLength={120} /></Field>
        <Field id="s-email" label="E-mail"><Input id="s-email" type="email" value={v.email} onChange={set("email")} required maxLength={200} /></Field>
        <Field id="s-company" label="Company" optional><Input id="s-company" value={v.company} onChange={set("company")} maxLength={200} /></Field>
        <Field id="s-sells" label="What do you sell?" optional hint="Products, price range, where you sell."><Input id="s-sells" value={v.sells} onChange={set("sells")} maxLength={300} /></Field>
        <Field id="s-ads" label="Ads per month" optional>
          <select id="s-ads" value={v.adsPerMonth} onChange={set("adsPerMonth")} className="focus-ring h-11 w-full rounded-control border border-border bg-surface px-3 text-[15px] text-ink">
            <option value="">Choose…</option>
            <option value="1-5">1 to 5</option>
            <option value="5-20">5 to 20</option>
            <option value="20-50">20 to 50</option>
            <option value="50+">More than 50</option>
          </select>
        </Field>
      </div>
      <Field id="s-message" label="Message" optional hint="What you want the ads to do, and anything we should know."><Textarea id="s-message" value={v.message} onChange={set("message")} maxLength={4000} rows={4} /></Field>
      <input type="text" name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="primary" disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Request a call
      </Button>
    </form>
  );
}
