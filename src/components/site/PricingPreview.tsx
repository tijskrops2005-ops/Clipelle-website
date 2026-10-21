import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { PLANS, formatPrice, type Plan } from "@/lib/plans";

/** The three paid plans and Free as a teaser; the full page is /pricing. */
export function PricingPreview({ className }: { className?: string }) {
  const shown: Plan[] = PLANS.filter((p) => p.key !== "enterprise");
  return (
    <div className={cn("grid gap-5 md:grid-cols-2 lg:grid-cols-4", className)}>
      {shown.map((p) => (
        <div key={p.key} className={cn("flex flex-col rounded-card bg-surface p-6 shadow-card", p.highlight && "ring-1 ring-ink")}>
          <p className="text-[17px] font-semibold text-ink">{p.name}</p>
          <p className="mt-1 text-[13px] text-muted">{p.tagline}</p>
          <p className="mt-5 text-display">{p.monthlyUsd === 0 ? "Free" : formatPrice(p.monthlyUsd)}<span className="text-base font-medium text-muted">{p.monthlyUsd === 0 ? "" : " /mo"}</span></p>
          <p className="mt-1 text-[13px] text-muted">{p.creditsPerMonth > 0 ? `${p.creditsPerMonth.toLocaleString("en-US")} credits per month` : p.creditsNote}</p>
          <ul className="mt-5 flex-1 space-y-2 text-[14px] text-ink/85">
            {p.bullets.slice(0, 3).map((b) => (
              <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{b}</li>
            ))}
          </ul>
          <Button href={p.key === "free" ? "/signup" : "/pricing"} variant={p.highlight ? "accent" : "secondary"} className="mt-6 w-full">
            {p.key === "free" ? "Start free" : "See details"}
          </Button>
        </div>
      ))}
      <p className="text-center text-[15px] text-muted md:col-span-2 lg:col-span-4">
        <Link href="/pricing" className="focus-ring inline-flex items-center gap-1 rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">Compare all plans and credit packs <ArrowRight className="size-4" aria-hidden /></Link>
      </p>
    </div>
  );
}
