"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Gift, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { PLANS, planByKey, TOPUPS, formatPrice, type Plan } from "@/lib/plans";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { PricingTable } from "@/components/site/PricingTable";
import { DemoBadge } from "@/components/DemoModeBadge";

type Status = { enabled: boolean; planKey: string; subscriptionStatus: string | null; currentPeriodEnd: string | null; balance: number; freeAd: { granted: boolean; reason?: string }; freeAdsPerDay: number; emailVerified: boolean };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `Request failed (${r.status}).`);
  return body as T;
}

/** Plan, credits, free ad, checkout and the customer portal. Without payment keys a disabled state. */
export function BillingSettings() {
  const params = useSearchParams();
  const demoStatus: Status = { enabled: false, planKey: "free", subscriptionStatus: null, currentPeriodEnd: null, balance: 120, freeAd: { granted: true }, freeAdsPerDay: 10, emailVerified: true };
  const [status, setStatus] = useState<Status | null>(() => (config.demoMode ? demoStatus : null));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const checkout = params.get("checkout");

  useEffect(() => {
    if (config.demoMode) return;
    let alive = true;
    api<Status>("/api/billing/status").then((s) => alive && setStatus(s)).catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  async function choose(plan: Plan, interval: "monthly" | "annual") {
    setBusy(plan.key);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ kind: "plan", planKey: plan.key, interval }) });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open checkout.");
      setBusy(null);
    }
  }
  async function topup(key: string) {
    setBusy(key);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ kind: "topup", topupKey: key }) });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open checkout.");
      setBusy(null);
    }
  }
  async function portal() {
    setBusy("portal");
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the portal.");
      setBusy(null);
    }
  }

  const plan = planByKey(status?.planKey) ?? PLANS[0];
  const enabled = Boolean(status?.enabled) && !config.demoMode;

  return (
    <>
      {checkout === "success" && <p role="status" className="rounded-chip bg-success/10 px-4 py-2.5 text-sm text-ink">Thanks. Your credits appear here as soon as the payment is confirmed (usually within a minute).</p>}
      {checkout === "cancelled" && <p role="status" className="rounded-chip bg-surface-muted px-4 py-2.5 text-sm text-muted">Checkout cancelled. Nothing was charged.</p>}
      {error && <p role="alert" className="rounded-chip bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>}

      {(status?.subscriptionStatus === "past_due" || status?.subscriptionStatus === "unpaid") && (
        <div role="alert" className="flex flex-col gap-3 rounded-chip bg-danger/10 px-4 py-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
          <span>{status.subscriptionStatus === "unpaid" ? "Your plan payment did not go through after several tries. Update your card to keep your plan; your credits stay." : "Your last plan payment did not go through. We try again automatically; update your card to fix it now. Your credits stay."}</span>
          <Button type="button" variant="primary" size="sm" onClick={portal} disabled={busy !== null}><CreditCard className="size-4" aria-hidden />Update card</Button>
        </div>
      )}

      <SectionCard title="Your plan" description="What you are on, your credits and the free credits." aside={<DemoBadge>Demo numbers</DemoBadge>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel p-4">
            <p className="label-mono text-muted">Plan</p>
            <p className="mt-1 text-[17px] font-semibold text-ink">{plan.name}</p>
            <p className="text-[13px] text-muted">{subscriptionLine(status?.subscriptionStatus ?? null, status?.currentPeriodEnd ?? null, plan.key === "free")}</p>
          </div>
          <div className="panel p-4">
            <p className="label-mono text-muted">Credits</p>
            <p className="mt-1 text-[17px] font-semibold text-ink">{status ? status.balance.toLocaleString("en-US") : "…"}</p>
            <p className="text-[13px] text-muted">One credit = one second of translated video. Credits never expire.</p>
          </div>
          <div className="panel p-4">
            <p className="label-mono text-muted">Free credits</p>
            <p className="mt-1 flex items-center gap-2 text-[17px] font-semibold text-ink"><Gift className="size-4 text-accent" aria-hidden />{status?.freeAd.granted ? "Granted" : status?.freeAd.reason === "unverified" ? "After verification" : status?.freeAd.reason === "cap" ? "Daily cap reached" : "…"}</p>
            <p className="text-[13px] text-muted">{status?.freeAd.reason === "cap" ? "All free credits for today are given out; you are on the list for tomorrow." : "30 credits per verified e-mail address: half a minute of translation or one 10-second ad."}</p>
          </div>
        </div>
        {enabled && status?.planKey !== "free" && (
          <Button type="button" variant="secondary" onClick={portal} disabled={busy !== null} className="mt-2">
            {busy === "portal" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
            Manage subscription and invoices
          </Button>
        )}
      </SectionCard>

      {!enabled && (
        <SectionCard title="Payments" description={config.demoMode ? "Demo mode: payments are simulated away. In database mode with Stripe test keys this card shows checkout." : "Payments are not configured on this server yet. Set STRIPE_SECRET_KEY (test) and STRIPE_WEBHOOK_SECRET in .env.local and run the setup script; until then plans and packs are read-only."}>
          <Badge tone="warning">Not configured</Badge>
        </SectionCard>
      )}

      <SectionCard title="Credit packs" description={status?.planKey === "free" ? "One-off credits on top of a paid plan. Choose a plan first: the free plan runs on its free credits." : "One-off credits on top of your plan."}>
        <div className="grid gap-3 sm:grid-cols-3">
          {TOPUPS.map((t) => (
            <Button key={t.key} type="button" variant="secondary" onClick={() => topup(t.key)} disabled={!enabled || busy !== null || status?.planKey === "free"} className="justify-between">
              <span>{t.credits.toLocaleString("en-US")} credits</span>
              <span className="text-muted">{formatPrice(t.usd)}</span>
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Plans" description="Monthly credits, cancel any time from the portal.">
        <PricingTable compact onChoose={enabled ? choose : undefined} busyKey={busy} />
      </SectionCard>
    </>
  );
}

/** The subscription state in words (26 Oct 2026): never a raw Stripe status on screen. */
function subscriptionLine(subscriptionStatus: string | null, periodEnd: string | null, free: boolean) {
  const date = periodEnd ? new Date(periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  switch (subscriptionStatus) {
    case "active":
    case "trialing":
      return date ? `Renews ${date}` : "Active";
    case "canceling":
      return date ? `Cancelled: active until ${date}; your credits stay` : "Cancelled at the end of the period";
    case "past_due":
      return "Payment failed: we retry automatically";
    case "unpaid":
      return "Payment failed: update your card";
    case "canceled":
      return "Cancelled";
    default:
      return free ? "No subscription" : subscriptionStatus ?? "";
  }
}

