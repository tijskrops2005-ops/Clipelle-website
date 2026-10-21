"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { BUSINESS_TIERS, CREDIT_EXPIRY, PLANS, TOPUPS, activeListPrice, adCreditTable, formatPrice, translateCredits, type Plan } from "@/lib/plans";
import { annualTotals, planExamples, usdPerCredit } from "@/lib/pricingHelpers";
import { PlanFinder } from "./PlanFinder";

type Interval = "monthly" | "annual";
type Tab = "individual" | "business" | "api";

/**
 * The pricing page body: tabs Individual / Business / API, a monthly-annual switch with the real
 * saving, plan cards (crossed-out prices only from plans.ts), comparison table, plan finder.
 * Every number comes from plans.ts and pricing.ts. `compact` (Billing settings) shows the cards only.
 */
export function PricingTable({ onChoose, busyKey, compact }: { onChoose?: (plan: Plan, interval: Interval) => void; busyKey?: string | null; compact?: boolean }) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [tab, setTab] = useState<Tab>("individual");
  const [tier, setTier] = useState<string>(BUSINESS_TIERS[0].key);
  const base = useId();
  const paid = PLANS.filter((p) => p.key !== "free" && p.key !== "enterprise");
  const free = PLANS.find((p) => p.key === "free")!;
  const business = BUSINESS_TIERS.find((t) => t.key === tier) ?? BUSINESS_TIERS[0];
  const maxSaving = useMemo(() => Math.max(...paid.map((p) => annualTotals(p).savingPct)), [paid]);

  const tabs: { key: Tab; label: string }[] = [{ key: "individual", label: "Individual" }, { key: "business", label: "Business" }, { key: "api", label: "API" }];

  return (
    <div className="space-y-16">
      <div className="flex flex-col items-center gap-4">
        <div role="tablist" aria-label="Plan types" className="inline-flex gap-1 rounded-full bg-surface-muted p-1" onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const i = tabs.findIndex((t) => t.key === tab);
          const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          setTab(next.key);
          document.getElementById(`${base}-tab-${next.key}`)?.focus();
        }}>
          {tabs.map((t) => (
            <button key={t.key} id={`${base}-tab-${t.key}`} role="tab" type="button" aria-selected={tab === t.key} aria-controls={`${base}-panel-${t.key}`} tabIndex={tab === t.key ? 0 : -1} onClick={() => setTab(t.key)} className={cn("focus-ring h-10 rounded-full px-5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150", tab === t.key ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}>{t.label}</button>
          ))}
        </div>
        {tab !== "api" && (
          <div className="flex flex-col items-center gap-2">
            <SegmentedControl label="Billing period" options={[{ key: "monthly", label: "Monthly" }, { key: "annual", label: `Annual · save up to ${maxSaving}%` }]} value={interval} onChange={setInterval} />
            <p className="text-[13px] text-muted">Prices in US dollars, excluding VAT where it applies. Credits never expire.</p>
          </div>
        )}
      </div>

      <div id={`${base}-panel-individual`} role="tabpanel" aria-labelledby={`${base}-tab-individual`} hidden={tab !== "individual"} className={cn(tab === "individual" && "fold-in")}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <PlanCard plan={free} interval={interval} cta={<Button href="/signup" variant="secondary" className="w-full">Start free</Button>} />
          {paid.map((p, i) => (
            <PlanCard key={p.key} plan={p} previous={i === 0 ? free : paid[i - 1]} interval={interval} cta={
              onChoose ? (
                <Button type="button" variant={p.recommended ? "accent" : "primary"} className="w-full" onClick={() => onChoose(p, interval)} disabled={Boolean(busyKey)}>{busyKey === p.key ? "Opening checkout…" : `Choose ${p.name}`}</Button>
              ) : (
                <Button href={`/signup?next=${encodeURIComponent(`/settings/billing?plan=${p.key}&interval=${interval}`)}`} variant={p.recommended ? "accent" : "primary"} className="w-full">Choose {p.name}</Button>
              )
            } />
          ))}
        </div>
        <div className="mt-8 rounded-card bg-surface p-6 shadow-card">
          <p className="text-[17px] font-semibold text-ink">Credit packs</p>
          <p className="mt-1 text-[15px] text-muted">One-off, on top of a paid plan. Credits never expire.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {TOPUPS.map((t) => (
              <li key={t.key} className="flex items-center justify-between rounded-chip bg-surface-muted px-4 py-2.5 text-sm"><span className="font-medium text-ink">{t.credits.toLocaleString("en-US")} credits</span><span className="text-muted">{formatPrice(t.usd)}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div id={`${base}-panel-business`} role="tabpanel" aria-labelledby={`${base}-tab-business`} hidden={tab !== "business"} className={cn(tab === "business" && "fold-in")}>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col rounded-card bg-surface p-6 shadow-card ring-1 ring-ink">
            <p className="text-[17px] font-semibold text-ink">{business.name}</p>
            <p className="mt-1 text-[13px] text-muted">{business.tagline}: one shared credit pool, members with their own sign-in, no cost per seat.</p>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-ink">Shared credits per month</p>
              <SegmentedControl label="Business credit level" options={BUSINESS_TIERS.map((t) => ({ key: t.key, label: `${t.creditsPerMonth.toLocaleString("en-US")}` }))} value={tier} onChange={setTier} />
            </div>
            <PriceLine plan={business} interval={interval} className="mt-5" />
            <Examples plan={business} />
            <ul className="mt-5 flex-1 space-y-2 text-[14px] text-ink/85">{business.bullets.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}</ul>
            <p className="mt-4 text-[13px] text-muted">Members need the Business plan on the team workspace; the Owner picks it in Billing after creating the team under Settings → Team.</p>
            <div className="mt-6">
              {onChoose ? (
                <Button type="button" variant="primary" className="w-full" onClick={() => onChoose(business, interval)} disabled={Boolean(busyKey)}>{busyKey === business.key ? "Opening checkout…" : "Choose Business"}</Button>
              ) : (
                <Button href={`/signup?next=${encodeURIComponent(`/settings/team`)}`} variant="primary" className="w-full">Start with a team workspace</Button>
              )}
            </div>
          </div>
          <div className="flex flex-col rounded-card bg-surface p-6 shadow-card">
            <p className="text-[17px] font-semibold text-ink">Enterprise</p>
            <p className="mt-1 text-[13px] text-muted">Custom volume and terms</p>
            <p className="mt-5 text-display">Let&apos;s talk</p>
            <ul className="mt-5 flex-1 space-y-2 text-[14px] text-ink/85">{["Custom credits and billing", "A direct line for questions", "Onboarding on a call"].map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}</ul>
            <div className="mt-6"><Button href="/demo" variant="secondary" className="w-full">Contact sales <ArrowRight className="size-4" aria-hidden /></Button></div>
          </div>
        </div>
      </div>

      <div id={`${base}-panel-api`} role="tabpanel" aria-labelledby={`${base}-tab-api`} hidden={tab !== "api"} className={cn(tab === "api" && "fold-in")}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card">
            <p className="text-[17px] font-semibold text-ink">The same credits, from your code</p>
            <p className="mt-1 text-[15px] text-muted">The API has no separate prices. Every plan with credits (Starter, Pro, Scale, Business) can create keys in Settings → API keys; an API project costs exactly what the form shows.</p>
            <ul className="mt-4 space-y-2 text-[14px] text-ink/85">{["60 requests per minute per key", "Images up to 10 MB, logos 2 MB, videos up to 32 MB and 3 minutes, from public links", "Idempotency keys so a retry never makes a second video", "Projects scoped to the workspace of the key", "No webhooks yet: poll the project"].map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}</ul>
            <div className="mt-6 flex flex-wrap gap-2"><Button href="/docs/api" variant="primary">API docs</Button><Button href="/docs/mcp" variant="secondary">MCP server</Button></div>
          </div>
          <CreditTable />
        </div>
      </div>

      {!compact && (
        <>
          <section>
            <h3 className="text-title text-center">What a credit buys</h3>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-muted">One credit is one second of Standard presenter video, including the script, the product clip and the edit. The dollar column is what that costs on the Pro plan (price ÷ credits); the form shows the exact number for your choices before you start.</p>
            <div className="mt-8"><CreditTable wide /></div>
          </section>

          <section>
            <h3 className="text-title text-center">Find your plan</h3>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-muted">Move the sliders; the credits, the best fitting plan and the monthly cost follow from the plan prices. Your current cost per video is your own number.</p>
            <div className="mt-8"><PlanFinder /></div>
          </section>

          <section>
            <h3 className="text-title text-center">Compare the plans</h3>
            <CompareTable />
          </section>
        </>
      )}
    </div>
  );
}

function PriceLine({ plan, interval, className }: { plan: Plan; interval: Interval; className?: string }) {
  const price = interval === "annual" ? plan.annualMonthlyUsd : plan.monthlyUsd;
  const list = activeListPrice(plan);
  const struck = interval === "annual" && plan.monthlyUsd > 0 ? plan.monthlyUsd : list && list > plan.monthlyUsd ? list : null;
  const totals = annualTotals(plan);
  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        {struck !== null && <s className="text-[20px] text-muted" aria-label={`was ${formatPrice(struck)} per month`}>{formatPrice(struck)}</s>}
        <span className="text-display">{price === 0 ? "Free" : formatPrice(price)}</span>
        {price > 0 && <span className="text-base font-medium text-muted">/mo</span>}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        {price === 0 ? plan.creditsNote : interval === "annual" ? `${formatPrice(totals.yearUsd)} a year, billed once · saves ${formatPrice(totals.savingUsd)} · ${plan.creditsNote}` : plan.creditsNote}
        {list && interval === "monthly" && list > plan.monthlyUsd ? ` · launch price until ${new Date(plan.listPrice!.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
      </p>
    </div>
  );
}

function Examples({ plan }: { plan: Plan }) {
  if (plan.creditsPerMonth === 0) return null;
  const e = planExamples(plan);
  return <p className="mt-3 text-[13px] text-muted">About {e.ads30} ads of 30 s, or {e.ads10} of 10 s, or {e.premium30} Premium ads of 30 s, or {e.translateMinutes} translation minutes a month.</p>;
}

function PlanCard({ plan, previous, interval, cta }: { plan: Plan; previous?: Plan; interval: Interval; cta: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover", plan.recommended && "ring-1 ring-ink")}>
      {plan.recommended && <span className="label-mono mb-3 w-fit rounded-full bg-ink px-2.5 py-1 text-surface">Our recommendation</span>}
      <p className="text-[17px] font-semibold text-ink">{plan.name}</p>
      <p className="mt-1 text-[13px] text-muted">{plan.tagline}</p>
      <PriceLine plan={plan} interval={interval} className="mt-5" />
      <Examples plan={plan} />
      <p className="mt-3 text-[13px] font-medium text-ink">{plan.key === "free" ? `The free ad expires after ${CREDIT_EXPIRY.freeAdDays} days.` : "Credits never expire."}</p>
      {previous && previous.key !== "free" && <p className="mt-4 label-mono text-muted">Everything in {previous.name}, plus</p>}
      <ul className="mt-2 flex-1 space-y-2 text-[14px] text-ink/85">
        {plan.bullets.map((b) => <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>)}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}

function CreditTable({ wide }: { wide?: boolean }) {
  const table = adCreditTable();
  const pro = PLANS.find((p) => p.key === "pro")!;
  const rate = usdPerCredit(pro);
  const perMinute = { speed: translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }), precision: translateCredits({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }) };
  const usd = (c: number) => formatPrice(Math.round(c * rate * 100) / 100);
  return (
    <div className={cn("grid gap-5", wide && "md:grid-cols-2")}>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">Ad length</th><th className="px-5 py-3 font-medium">Standard</th><th className="px-5 py-3 font-medium">Premium</th></tr></thead>
          <tbody className="divide-y divide-divider">
            {table.map((r) => (
              <tr key={r.seconds}><td className="px-5 py-3 font-medium text-ink">{r.seconds} s</td><td className="px-5 py-3">{r.standard} credits <span className="text-muted">≈ {usd(r.standard)}</span></td><td className="px-5 py-3">{r.premium} credits <span className="text-muted">≈ {usd(r.premium)}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">Translation, per minute per language</th><th className="px-5 py-3 font-medium">Credits</th></tr></thead>
          <tbody className="divide-y divide-divider">
            <tr><td className="px-5 py-3 font-medium text-ink">Speed</td><td className="px-5 py-3">{perMinute.speed} <span className="text-muted">≈ {usd(perMinute.speed)}</span></td></tr>
            <tr><td className="px-5 py-3 font-medium text-ink">Precision</td><td className="px-5 py-3">{perMinute.precision} <span className="text-muted">≈ {usd(perMinute.precision)}</span></td></tr>
            <tr><td className="px-5 py-3 text-muted" colSpan={2}>Picture enhancement adds a little per minute; the form shows it. Dollar values at the {pro.name} rate.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareTable() {
  const free = PLANS.find((p) => p.key === "free")!;
  const paid = PLANS.filter((p) => p.key !== "free" && p.key !== "enterprise");
  const business = BUSINESS_TIERS[0];
  const cols = [free, ...paid, business];
  const rows: [string, (p: Plan) => string | boolean][] = [
    ["Credits per month", (p) => (p.key === "free" ? "One free 10 s ad" : p.team ? `${BUSINESS_TIERS[0].creditsPerMonth.toLocaleString("en-US")} to ${BUSINESS_TIERS[BUSINESS_TIERS.length - 1].creditsPerMonth.toLocaleString("en-US")}` : p.creditsPerMonth.toLocaleString("en-US"))],
    ["Ad lengths", (p) => (p.key === "free" ? "10 s only" : "10 to 60 s")],
    ["Premium presenter", (p) => p.key !== "free"],
    ["Translations, 190 languages", (p) => p.key !== "free"],
    ["Brand defaults", () => true],
    ["API access and MCP", (p) => p.key !== "free"],
    ["Team workspace and members", (p) => Boolean(p.team)],
    ["Per-member usage for the owner", (p) => Boolean(p.team)],
    ["Credits expire", (p) => (p.key === "free" ? `Free ad: ${CREDIT_EXPIRY.freeAdDays} days` : "Never")],
    ["Support", () => "Contact form, answered by e-mail"],
  ];
  return (
    <div className="mt-8 overflow-x-auto rounded-card bg-surface shadow-card">
      <table className="w-full min-w-[720px] text-left text-[15px]">
        <thead className="bg-surface-muted text-[13px] text-muted lg:sticky lg:top-20">
          <tr><th className="px-5 py-3 font-medium">Feature</th>{cols.map((p) => <th key={p.key} className="px-5 py-3 font-medium text-ink">{p.name}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {rows.map(([label, fn]) => (
            <tr key={label}>
              <td className="px-5 py-3 text-ink">{label}</td>
              {cols.map((p) => {
                const v = fn(p);
                return <td key={p.key} className="px-5 py-3 text-muted">{v === true ? <Check className="size-4 text-success" aria-label="Included" /> : v === false ? <Minus className="size-4 text-border" aria-label="Not included" /> : v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-5 py-3 text-[13px] text-muted">Enterprise: custom. <Link href="/demo" className="underline">Contact sales</Link>. The app name is {config.productName} on every plan; there is no white-label.</p>
    </div>
  );
}
