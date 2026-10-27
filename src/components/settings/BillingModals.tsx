"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TRIAL, formatMoney, planLabel } from "@/lib/plans";
import type { PlanChange } from "@/lib/planChange";

const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const n = (v: number) => v.toLocaleString("en-US");

/**
 * "You're upgrading to Pro" (26 Oct 2026): the plan, the credits and the money in one place before
 * anyone leaves for Stripe. A trial says plainly what happens on which day; a plan change for a
 * current subscriber goes on to the billing portal, which shows the exact amount before confirming.
 */
export function PlanConfirmModal({ change, busy, onConfirm, onClose }: { change: PlanChange | null; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  const c = change;
  const money = (v: number) => (c ? formatMoney(v, c.currency) : "");
  const per = c?.interval === "annual" ? " a year" : " a month";
  const title = !c ? "" : c.mode === "trial" ? `Try ${planLabel(c.to)} free for ${TRIAL.days} days` : c.direction === "downgrade" ? `You're switching to ${planLabel(c.to)}` : `You're upgrading to ${planLabel(c.to)}`;
  const button = !c ? "" : c.mode === "trial" ? "Start free trial" : c.mode === "new" ? "Continue to payment" : "Review and confirm";
  return (
    <Modal
      open={Boolean(c)}
      onClose={onClose}
      title={title}
      description={c?.mode === "change" ? "Your billing portal shows the exact amount before anything changes." : "Secure payment by Stripe. Prices exclude VAT where it applies."}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" variant="accent" onClick={onConfirm} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}{button}{!busy && <ArrowRight className="size-4" aria-hidden />}</Button>
        </div>
      }
    >
      {c && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-panel bg-surface-muted p-4">
            <div>
              <p className="label-mono text-muted">Now</p>
              <p className="mt-1 text-[15px] font-semibold text-ink">{planLabel(c.from)}</p>
              <p className="text-[13px] text-muted">{c.creditsBefore > 0 ? `${n(c.creditsBefore)} credits a month` : "No monthly credits"}</p>
            </div>
            <ArrowRight className="size-4 text-muted" aria-hidden />
            <div>
              <p className="label-mono text-muted">New</p>
              <p className="mt-1 text-[15px] font-semibold text-ink">{planLabel(c.to)}</p>
              <p className="text-[13px] text-muted">{n(c.creditsAfter)} credits a month</p>
            </div>
          </div>
          <dl className="divide-y divide-divider text-[14px]">
            <Row label="Price">{money(c.amount)}{per}</Row>
            {c.mode === "trial" && c.trialEnds && (
              <>
                <Row label="Due today"><strong className="text-ink">{money(0)}</strong></Row>
                <Row label="During the trial">Your free credits; start the plan early any time under Billing to get its credits at once</Row>
                <Row label={`On ${date(c.trialEnds)}`}>{money(c.amount)}, then {n(c.creditsAfter)} credits every month</Row>
              </>
            )}
            {c.mode === "new" && c.dueToday !== null && (
              <>
                <Row label="Due today"><strong className="text-ink">{money(c.dueToday)}</strong></Row>
                <Row label="Credits">{n(c.creditsAfter)} as soon as the payment is confirmed, then every month</Row>
              </>
            )}
            {c.mode === "change" && <Row label="When">{c.direction === "downgrade" ? "From your next renewal; your credits stay" : "Right away; the new credits come with your next renewal"}</Row>}
          </dl>
          {c.mode === "trial" && c.trialEnds && <p className="rounded-panel bg-success/10 px-4 py-3 text-[13px] text-ink">Cancel any time before {date(c.trialEnds)} under Billing and you pay nothing. One free trial per account; a card is needed to start it.</p>}
          <p className="text-[13px] text-muted">Credits never expire. Cancel any time from the billing portal.</p>
        </div>
      )}
    </Modal>
  );
}

export type StartNowQuote = { amountCents: number | null; currency: string; interval: "monthly" | "annual"; credits: number | null; planKey: string };

/**
 * "Start my plan now" (27 Oct 2026): ends the free trial today. The price comes from the subscription
 * itself (excluding VAT), the credits from the plan: a month's worth, or twelve months on an annual price.
 */
export function StartNowModal({ quote, planName, busy, onConfirm, onClose }: { quote: StartNowQuote | null; planName: string; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  const q = quote;
  const money = q?.amountCents != null ? formatMoney(q.amountCents / 100, q.currency === "eur" ? "eur" : "usd") : null;
  return (
    <Modal
      open={Boolean(q)}
      onClose={onClose}
      title={`Start ${planName} now`}
      description="Your free trial ends today and your plan starts right away."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Keep my trial</Button>
          <Button type="button" variant="accent" onClick={onConfirm} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}{money ? `Pay ${money} and start` : "Start my plan"}</Button>
        </div>
      }
    >
      {q && (
        <div className="space-y-4">
          <dl className="divide-y divide-divider text-[14px]">
            <Row label="Due today"><strong className="text-ink">{money ?? "Your plan's price"}</strong>{q.interval === "annual" ? " for the year" : ""}</Row>
            <Row label="Credits">{q.credits ? `${n(q.credits)} credits` : "Your plan's credits"} as soon as the payment is confirmed, then every month</Row>
            <Row label="Next payment">{q.interval === "annual" ? "In a year" : "In a month"}, then every {q.interval === "annual" ? "year" : "month"}</Row>
          </dl>
          <p className="text-[13px] text-muted">We charge the card you added for the trial. Prices exclude VAT where it applies. Credits never expire; cancel any time from the billing portal.</p>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
