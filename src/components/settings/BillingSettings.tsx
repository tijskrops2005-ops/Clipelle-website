"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Coins, CreditCard, Gift, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { CUSTOM_CREDITS, PLANS, planByKey, planLabel, customCreditsPrice, formatMoney, validCustomCredits, type Currency, type Plan } from "@/lib/plans";
import { planChange, type Interval, type PlanChange } from "@/lib/planChange";
import { PlanConfirmModal } from "@/components/settings/BillingModals";
import { CreditsSlider } from "@/components/site/CreditsSlider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { PricingTable } from "@/components/site/PricingTable";
import { DemoBadge } from "@/components/DemoModeBadge";

type Status = { enabled: boolean; planKey: string; trialAvailable?: boolean; subscriptionStatus: string | null; currentPeriodEnd: string | null; balance: number; freeAd: { granted: boolean; reason?: string }; freeAdsPerDay: number; emailVerified: boolean };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error ?? `Request failed (${r.status}).`);
  return body as T;
}

const noSubscribe = () => () => {};
/** True when the visitor chose the Dutch site (the language cookie); false on the server. */
const readDutchSite = () => /(?:^|;\s*)clipelle_lang=nl(?:;|$)/.test(document.cookie);

/** Plan, credits, free ad, checkout and the customer portal. Without payment keys a disabled state. */
export function BillingSettings() {
  const params = useSearchParams();
  const demoStatus: Status = { enabled: false, planKey: "free", subscriptionStatus: null, currentPeriodEnd: null, balance: 120, freeAd: { granted: true }, freeAdsPerDay: 10, emailVerified: true };
  const [status, setStatus] = useState<Status | null>(() => (config.demoMode ? demoStatus : null));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const checkout = params.get("checkout");
  // Dollars or euros for plans and packs; a customer who already pays keeps their currency (server side).
  // Default: euros when the site link says so (`?currency=eur` from /nl) or the visitor chose the Dutch site.
  const dutchSite = useSyncExternalStore(noSubscribe, readDutchSite, () => false);
  const [picked, setCurrency] = useState<Currency | null>(null);
  const param = params.get("currency");
  const currency: Currency = picked ?? (param === "eur" || param === "usd" ? param : dutchSite ? "eur" : "usd");

  // A site link for credits lands on the slider.
  const creditsParam = params.get("credits");
  useEffect(() => {
    if (creditsParam) document.getElementById("add-credits")?.scrollIntoView({ block: "center" });
  }, [creditsParam]);

  useEffect(() => {
    if (config.demoMode) return;
    let alive = true;
    api<Status>("/api/billing/status").then((s) => alive && setStatus(s)).catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  // A plan pick opens the confirm window first (26 Oct 2026); nothing goes to Stripe before "Continue".
  const [pending, setPending] = useState<PlanChange | null>(null);
  const [paramDismissed, setParamDismissed] = useState(false);
  // Any amount of credits (26 Oct 2026); a site link `?credits=750` sets the amount.
  const [credits, setCredits] = useState(() => {
    const n = Number(params.get("credits"));
    return validCustomCredits(n) ? n : 500;
  });
  const hasSubscription = Boolean(status && status.planKey !== "free" && ["active", "trialing", "past_due", "canceling"].includes(status.subscriptionStatus ?? ""));
  const changeTo = (to: Plan, interval: Interval) => planChange({ from: planByKey(status?.planKey) ?? PLANS[0], to, interval, currency, trialAvailable: Boolean(status?.trialAvailable), hasSubscription });
  function choose(plan: Plan, interval: Interval) {
    setError(null);
    setPending(changeTo(plan, interval));
  }
  // A link from the site (`?plan=pro_2&interval=annual`) opens the same window once the status is known.
  const paramPlan = planByKey(params.get("plan"));
  const paramInterval: Interval = params.get("interval") === "monthly" ? "monthly" : "annual";
  const fromLink = !paramDismissed && !checkout && paramPlan?.stripeLookup && status?.enabled && !config.demoMode && paramPlan.key !== status.planKey ? changeTo(paramPlan, paramInterval) : null;
  const shown = pending ?? fromLink;
  function closeConfirm() {
    setPending(null);
    setParamDismissed(true);
  }
  async function confirm() {
    if (!shown) return;
    setBusy(shown.to.key);
    setError(null);
    try {
      // A current subscriber changes plan or level in the portal (the checkout refuses a second subscription).
      const { url } = shown.mode === "change"
        ? await api<{ url: string }>("/api/billing/portal", { method: "POST", body: JSON.stringify({ planKey: shown.to.key, interval: shown.interval }) })
        : await api<{ url: string }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ kind: "plan", planKey: shown.to.key, interval: shown.interval, currency }) });
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open checkout.");
      setBusy(null);
      closeConfirm();
    }
  }
  async function buyCredits() {
    setBusy("credits");
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ kind: "credits", credits, currency }) });
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
      {checkout === "changed" && <p role="status" className="rounded-chip bg-success/10 px-4 py-2.5 text-sm text-ink">Plan change confirmed. It shows here within a minute.</p>}
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
            <p className="mt-1 text-[17px] font-semibold text-ink">{planLabel(plan)}</p>
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
        <div className="mt-2 flex flex-wrap gap-2">
          {enabled && (
            <Button type="button" variant="primary" onClick={() => document.getElementById("add-credits")?.scrollIntoView({ behavior: "smooth", block: "center" })} disabled={busy !== null}>
              <Coins className="size-4" aria-hidden />Add credits
            </Button>
          )}
          {enabled && status?.planKey !== "free" && (
            <Button type="button" variant="secondary" onClick={portal} disabled={busy !== null}>
              {busy === "portal" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
              Manage subscription and invoices
            </Button>
          )}
        </div>
      </SectionCard>

      {!enabled && (
        <SectionCard title="Payments" description={config.demoMode ? "Demo mode: payments are simulated away. In database mode with Stripe test keys this card shows checkout." : "Payments are not configured on this server yet. Set STRIPE_SECRET_KEY (test) and STRIPE_WEBHOOK_SECRET in .env.local and run the setup script; until then plans and packs are read-only."}>
          <Badge tone="warning">Not configured</Badge>
        </SectionCard>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-sm text-muted">Prices excluding VAT, in</span>
        <SegmentedControl label="Currency" size="sm" options={[{ key: "usd", label: "USD $" }, { key: "eur", label: "EUR €" }]} value={currency} onChange={(k) => setCurrency(k as Currency)} />
      </div>

      <SectionCard id="add-credits" title="Add credits" description={status?.planKey === "free" ? "One-off credits on top of a paid plan. Choose a plan first: the free plan runs on its free credits." : "Any amount, one-off, on top of your plan. Credits never expire."}>
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div className="panel p-5">
            <CreditsSlider value={credits} onChange={setCredits} currency={currency} labels={{ amount: "How many credits", credits: "credits" }} />
          </div>
          <div className="space-y-2">
            {status && <p className="text-[14px] text-muted">Balance {status.balance.toLocaleString("en-US")} → <strong className="text-ink">{(status.balance + credits).toLocaleString("en-US")} credits</strong> once paid.</p>}
            <Button type="button" variant="primary" className="w-full" onClick={buyCredits} disabled={!enabled || busy !== null || status?.planKey === "free"}>
              {busy === "credits" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Coins className="size-4" aria-hidden />}
              Pay {formatMoney(customCreditsPrice(credits), currency)} for {credits.toLocaleString("en-US")} credits
            </Button>
            <p className="text-[12.5px] text-muted">{CUSTOM_CREDITS.min} to {CUSTOM_CREDITS.max.toLocaleString("en-US")} credits, {formatMoney(CUSTOM_CREDITS.unitCents / 100, currency)} each. Prices exclude VAT.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard id="plans" title="Plans" description="Monthly credits, cancel any time from the portal.">
        <PricingTable compact onChoose={enabled ? choose : undefined} busyKey={busy} currency={currency} trial={Boolean(status?.trialAvailable)} initialPlan={params.get("plan")} />
      </SectionCard>

      <PlanConfirmModal change={shown} busy={busy !== null} onConfirm={confirm} onClose={closeConfirm} />
    </>
  );
}

/** The subscription state in words (26 Oct 2026): never a raw Stripe status on screen. */
function subscriptionLine(subscriptionStatus: string | null, periodEnd: string | null, free: boolean) {
  const date = periodEnd ? new Date(periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  switch (subscriptionStatus) {
    case "active":
      return date ? `Renews ${date}` : "Active";
    case "trialing":
      return date ? `Free trial: first payment on ${date}` : "Free trial";
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

