"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import type { WaitlistFeature } from "@/lib/waitlistFeatures";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { Honeypot } from "@/components/site/Honeypot";

/** "Tell me when it is ready": stores an e-mail and the feature, nothing more. */
export function WaitlistForm({ feature, label, locale = "en" }: { feature: WaitlistFeature; label: string; locale?: Locale }) {
  const t = dict(locale).integrations;
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [stored, setStored] = useState(true);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feature, email, website }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? t.saveError);
      setStored(body.stored !== false);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 text-[15px] text-ink">
        <Check className="size-5 text-success" aria-hidden />
        {stored ? t.noted.replace("{label}", label) : config.demoMode ? t.demoNote : "OK"}
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="sr-only" htmlFor={`waitlist-${feature}`}>E-mail</label>
      <Input id={`waitlist-${feature}`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="sm:max-w-xs" disabled={state === "busy"} />
      <Honeypot value={website} onChange={setWebsite} />
      <Button type="submit" variant="primary" disabled={state === "busy" || !email}>
        {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t.tellMe}
      </Button>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </form>
  );
}
