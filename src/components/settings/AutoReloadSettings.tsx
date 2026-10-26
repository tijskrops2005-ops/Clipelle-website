"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { controlClass, controlStateClass } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { customCreditsPrice, formatMoney, type Currency } from "@/lib/plans";
import { AUTO_RELOAD_ADD, AUTO_RELOAD_BELOW, AUTO_RELOAD_MONTHLY_MAX, DEFAULT_AUTO_RELOAD, describeAutoReload, type AutoReload, type AutoReloadSettings } from "@/lib/autoReload";

/**
 * Auto-reload in Billing (26 Oct 2026): when the balance drops below a number, buy a set amount of
 * credits with the saved card, at most a few times a month. Off by default; turning it on is the
 * owner's consent to those charges, stated in plain words next to the switch.
 */
export function AutoReloadSettings({ value, currency, available, unavailableReason, onSaved }: { value: AutoReload | null; currency: Currency; available: boolean; unavailableReason: string; onSaved: (next: AutoReload) => void }) {
  const current: AutoReload = value ?? DEFAULT_AUTO_RELOAD;
  const [draft, setDraft] = useState<AutoReloadSettings>({ enabled: current.enabled, belowCredits: current.belowCredits, addCredits: current.addCredits, monthlyMax: current.monthlyMax });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const money = (v: number) => formatMoney(v, currency);
  const dirty = draft.enabled !== current.enabled || draft.belowCredits !== current.belowCredits || draft.addCredits !== current.addCredits || draft.monthlyMax !== current.monthlyMax;

  async function save(next: AutoReloadSettings) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch("/api/billing/auto-reload", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "Could not save auto-reload.");
      onSaved(body.autoReload);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save auto-reload.");
    } finally {
      setBusy(false);
    }
  }

  const select = (label: string, val: number, options: readonly number[], format: (n: number) => string, onChange: (n: number) => void) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <select value={val} onChange={(e) => onChange(Number(e.target.value))} disabled={!available || busy} className={cn(controlClass, controlStateClass(false), "h-11")}>
        {options.map((o) => (
          <option key={o} value={o}>{format(o)}</option>
        ))}
      </select>
    </label>
  );

  return (
    <SectionCard title="Auto-reload" description="Never run out in the middle of a busy week: credits are added automatically when your balance runs low.">
      {current.failedAt && !current.enabled && <p role="alert" className="rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-ink">{current.lastError ?? "The last automatic top-up did not go through, so auto-reload was switched off."}</p>}
      {!available && <p className="rounded-chip bg-surface-muted px-4 py-2.5 text-sm text-muted">{unavailableReason}</p>}

      <label className={cn("flex items-start gap-3 rounded-panel border p-4 transition-colors", available ? "cursor-pointer" : "cursor-not-allowed opacity-70", draft.enabled ? "border-ink bg-surface" : "border-border bg-surface hover:border-ink/30")}>
        <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={draft.enabled} disabled={!available || busy} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} />
        <span>
          <span className="flex items-center gap-2 text-sm font-medium text-ink"><RefreshCw className="size-4 text-accent" aria-hidden />Top up automatically</span>
          <span className="block text-[13px] leading-relaxed text-muted">{describeAutoReload(draft, money)} We charge the card saved for your plan and send an invoice each time. Turn it off here whenever you like.</span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        {select("When my balance drops below", draft.belowCredits, AUTO_RELOAD_BELOW, (n) => `${n.toLocaleString("en-US")} credits`, (n) => setDraft((d) => ({ ...d, belowCredits: n })))}
        {select("Add", draft.addCredits, AUTO_RELOAD_ADD, (n) => `${n.toLocaleString("en-US")} credits · ${money(customCreditsPrice(n))}`, (n) => setDraft((d) => ({ ...d, addCredits: n })))}
        {select("At most", draft.monthlyMax, AUTO_RELOAD_MONTHLY_MAX, (n) => `${n} ${n === 1 ? "time" : "times"} a month`, (n) => setDraft((d) => ({ ...d, monthlyMax: n })))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" onClick={() => save(draft)} disabled={!available || busy || !dirty}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {draft.enabled && !current.enabled ? "Turn on auto-reload" : !draft.enabled && current.enabled ? "Turn off auto-reload" : "Save"}
        </Button>
        {saved && !dirty && <span role="status" className="text-[13px] text-success">Saved.</span>}
        {error && <span role="alert" className="text-[13px] text-danger">{error}</span>}
      </div>
      <p className="text-[12.5px] text-muted">Prices exclude VAT. A failed payment switches auto-reload off, so your card is never tried again and again.</p>
    </SectionCard>
  );
}
