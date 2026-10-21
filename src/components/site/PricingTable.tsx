"use client";

import { useState } from "react";
import { ArrowRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ANNUAL_MONTHS_CHARGED, CREDIT_VALIDITY, PLANS, TOPUPS, adCreditTable, formatPrice, translateCredits, type Plan } from "@/lib/plans";

type Interval = "monthly" | "annual";

/** Plan cards with a monthly/annual switch, credit packs, the credit table and the comparison. */
export function PricingTable({ onChoose, busyKey, compact }: { onChoose?: (plan: Plan, interval: Interval) => void; busyKey?: string | null; compact?: boolean }) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const paid = PLANS.filter((p) => p.key !== "free" && p.key !== "enterprise");
  const free = PLANS.find((p) => p.key === "free")!;
  const enterprise = PLANS.find((p) => p.key === "enterprise")!;
  const table = adCreditTable();
  const perMinute = { speed: translateCredits({ seconds: 60, quality: "speed", enhance: false, languages: 1, hasSourceTranscript: true }), precision: translateCredits({ seconds: 60, quality: "precision", enhance: false, languages: 1, hasSourceTranscript: true }) };

  return (
    <div className="space-y-16">
      <div className="flex flex-col items-center gap-3">
        <SegmentedControl label="Billing period" options={[{ key: "monthly", label: "Monthly" }, { key: "annual", label: `Annual · ${12 - ANNUAL_MONTHS_CHARGED} months free` }]} value={interval} onChange={setInterval} />
        <p className="text-[13px] text-muted">Prices in US dollars, excluding VAT where it applies.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <PlanCard plan={free} interval={interval} cta={<Button href="/signup" variant="secondary" className="w-full">Start free</Button>} />
        {paid.map((p) => (
          <PlanCard
            key={p.key}
            plan={p}
            interval={interval}
            cta={
              onChoose ? (
                <Button type="button" variant={p.highlight ? "accent" : "primary"} className="w-full" onClick={() => onChoose(p, interval)} disabled={Boolean(busyKey)}>
                  {busyKey === p.key ? "Opening checkout…" : `Choose ${p.name}`}
                </Button>
              ) : (
                <Button href={`/signup?next=${encodeURIComponent(`/settings/billing?plan=${p.key}&interval=${interval}`)}`} variant={p.highlight ? "accent" : "primary"} className="w-full">
                  Choose {p.name}
                </Button>
              )
            }
          />
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-card bg-surface p-6 shadow-card">
          <p className="text-[17px] font-semibold text-ink">{enterprise.name}</p>
          <p className="mt-1 text-[15px] text-muted">{enterprise.tagline}: custom credits and billing, onboarding and a direct line. Tell us about the volume and we come back with a proposal.</p>
          <Button href="/demo" variant="primary" className="mt-5">Book a demo <ArrowRight className="size-4" aria-hidden /></Button>
        </div>
        <div className="rounded-card bg-surface p-6 shadow-card">
          <p className="text-[17px] font-semibold text-ink">Credit packs</p>
          <p className="mt-1 text-[15px] text-muted">One-off, on top of any plan. Valid for {CREDIT_VALIDITY.topup} months.</p>
          <ul className="mt-4 space-y-2">
            {TOPUPS.map((t) => (
              <li key={t.key} className="flex items-center justify-between rounded-chip bg-surface-muted px-4 py-2.5 text-sm">
                <span className="font-medium text-ink">{t.credits.toLocaleString("en-US")} credits</span>
                <span className="text-muted">{formatPrice(t.usd)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!compact && (
        <>
          <section>
            <h3 className="text-title text-center">What a credit buys</h3>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-muted">One credit is one second of Standard presenter video at the recommended length, including the script, the product clip and the edit. The form shows the exact number for your choices before you start.</p>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="overflow-hidden rounded-card bg-surface shadow-card">
                <table className="w-full text-left text-[15px]">
                  <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">Ad length</th><th className="px-5 py-3 font-medium">Standard</th><th className="px-5 py-3 font-medium">Premium</th></tr></thead>
                  <tbody className="divide-y divide-divider">
                    {table.map((r) => (
                      <tr key={r.seconds}><td className="px-5 py-3 font-medium text-ink">{r.seconds} s</td><td className="px-5 py-3">{r.standard} credits</td><td className="px-5 py-3">{r.premium} credits</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="overflow-hidden rounded-card bg-surface shadow-card">
                <table className="w-full text-left text-[15px]">
                  <thead className="bg-surface-muted text-[13px] text-muted"><tr><th className="px-5 py-3 font-medium">Translation, per minute per language</th><th className="px-5 py-3 font-medium">Credits</th></tr></thead>
                  <tbody className="divide-y divide-divider">
                    <tr><td className="px-5 py-3 font-medium text-ink">Speed</td><td className="px-5 py-3">{perMinute.speed}</td></tr>
                    <tr><td className="px-5 py-3 font-medium text-ink">Precision</td><td className="px-5 py-3">{perMinute.precision}</td></tr>
                    <tr><td className="px-5 py-3 text-muted" colSpan={2}>Picture enhancement adds a little per minute; the form shows it.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-title text-center">Compare the plans</h3>
            <div className="mt-8 overflow-x-auto rounded-card bg-surface shadow-card">
              <table className="w-full min-w-[640px] text-left text-[15px]">
                <thead className="bg-surface-muted text-[13px] text-muted">
                  <tr><th className="px-5 py-3 font-medium">Feature</th>{[free, ...paid].map((p) => <th key={p.key} className="px-5 py-3 font-medium text-ink">{p.name}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {[
                    ["Credits per month", (p: Plan) => (p.creditsPerMonth ? p.creditsPerMonth.toLocaleString("en-US") : "One free 10 s ad")],
                    ["Ads from a photo, 10–60 s", (p: Plan) => (p.key === "free" ? "10 s Standard only" : true)],
                    ["Premium presenter", (p: Plan) => p.key !== "free"],
                    ["Translations, 190 languages", (p: Plan) => p.key !== "free"],
                    ["Brand defaults saved", () => true],
                    ["Credits valid", (p: Plan) => (p.key === "free" ? "This month and next" : "This month and next")],
                    ["Credit packs on top", (p: Plan) => p.key !== "free"],
                    ["Support", (p: Plan) => (p.key === "scale" ? "Priority" : "E-mail")],
                  ].map(([label, fn]) => (
                    <tr key={label as string}>
                      <td className="px-5 py-3 text-ink">{label as string}</td>
                      {[free, ...paid].map((p) => {
                        const v = (fn as (p: Plan) => string | boolean)(p);
                        return <td key={p.key} className="px-5 py-3 text-muted">{v === true ? <Check className="size-4 text-success" aria-label="Included" /> : v === false ? <Minus className="size-4 text-border" aria-label="Not included" /> : v}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PlanCard({ plan, interval, cta }: { plan: Plan; interval: Interval; cta: React.ReactNode }) {
  const price = interval === "annual" ? plan.annualMonthlyUsd : plan.monthlyUsd;
  return (
    <div className={cn("flex flex-col rounded-card bg-surface p-6 shadow-card", plan.highlight && "ring-1 ring-ink")}>
      {plan.highlight && <span className="label-mono mb-3 w-fit rounded-full bg-ink px-2.5 py-1 text-surface">Recommended</span>}
      <p className="text-[17px] font-semibold text-ink">{plan.name}</p>
      <p className="mt-1 text-[13px] text-muted">{plan.tagline}</p>
      <p className="mt-5 text-display">{price === 0 ? "Free" : formatPrice(price)}<span className="text-base font-medium text-muted">{price === 0 ? "" : " /mo"}</span></p>
      <p className="mt-1 text-[13px] text-muted">{price === 0 ? plan.creditsNote : interval === "annual" ? `${formatPrice(Math.round(plan.annualMonthlyUsd * 12))} a year · ${plan.creditsNote}` : plan.creditsNote}</p>
      <ul className="mt-5 flex-1 space-y-2 text-[14px] text-ink/85">
        {plan.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}
