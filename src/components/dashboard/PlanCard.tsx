import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Crown } from "lucide-react";
import { PLANS, type Plan } from "@/lib/plans";

/**
 * The plan moment of the dashboard, in the brand's premium style: gold on ink (brand style guide).
 * Free: what a paid plan adds, from plans.ts only. Paid: the plan you are on and where to manage it.
 */
export function PlanCard({ plan }: { plan: Pick<Plan, "key" | "name" | "monthlyUsd" | "creditsNote"> | null }) {
  const paid = Boolean(plan && plan.monthlyUsd > 0);
  const recommended = PLANS.find((p) => p.recommended);
  return (
    <section className="rise relative overflow-hidden rounded-card bg-ink p-6 text-champagne shadow-card" style={{ "--rise-delay": "360ms" } as CSSProperties} aria-labelledby="plan-card">
      <div className="glow-field gold -right-10 -top-16 h-44 w-44" aria-hidden />
      <div className="glow-field gold-deep -bottom-20 -left-10 h-48 w-48" aria-hidden />
      <span className="relative grid size-10 place-items-center rounded-full bg-gold/15 text-gold-light ring-1 ring-gold/30"><Crown className="size-5" aria-hidden /></span>
      {paid ? (
        <>
          <h2 id="plan-card" className="relative mt-4 text-[17px] font-semibold text-champagne">You are on {plan!.name}</h2>
          <p className="relative mt-1.5 text-[13.5px] leading-relaxed text-champagne/70">{plan!.creditsNote}. Credits never expire.</p>
          <Link href="/settings/billing" className="focus-ring relative mt-5 inline-flex h-9 items-center gap-1.5 rounded-control bg-champagne px-4 text-[13px] font-semibold text-ink transition-transform duration-150 hover:-translate-y-px">
            Manage billing <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </>
      ) : (
        <>
          <h2 id="plan-card" className="relative mt-4 text-[17px] font-semibold text-champagne">More videos every month</h2>
          <p className="relative mt-1.5 text-[13.5px] leading-relaxed text-champagne/70">
            {recommended ? `${recommended.name}: ${recommended.bullets[0].charAt(0).toLowerCase()}${recommended.bullets[0].slice(1)}. ` : ""}Credits never expire.
          </p>
          <Link href="/settings/billing" className="focus-ring relative mt-5 inline-flex h-9 items-center gap-1.5 rounded-control bg-gold-light px-4 text-[13px] font-semibold text-ink transition-transform duration-150 hover:-translate-y-px">
            See plans <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </>
      )}
    </section>
  );
}
