"use client";

import { useState } from "react";
import { ArrowRight, Check, Gem, Rocket, Sparkles, Star, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { Currency } from "@/lib/plans";

export type PreviewCard = {
  key: string;
  name: string;
  tagline: string;
  monthly: string;
  annual: string;
  monthlyNote: string;
  annualNote: string;
  features: string[];
  recommended: boolean;
  cta: string;
  paid: boolean;
};

type Labels = { monthly: string; annual: string; save: string; billingLabel: string; perMonth: string; recommendation: string };

const ICONS: Record<string, LucideIcon> = { free: Zap, starter: Sparkles, pro: Rocket, scale: Gem };

/** The interactive part of the homepage pricing block: the billing switch and the four cards. */
export function PricingCards({ cards, labels, currency = "usd" }: { cards: PreviewCard[]; labels: Labels; currency?: Currency }) {
  const [annual, setAnnual] = useState(true);
  const interval = annual ? "annual" : "monthly";
  return (
    <>
      <div className="flex items-center justify-center gap-3 text-[14px]">
        <span className={cn("font-medium transition-colors", annual ? "text-muted" : "text-ink")}>{labels.monthly}</span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label={labels.billingLabel}
          onClick={() => setAnnual((a) => !a)}
          className={cn("focus-ring relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200", annual ? "bg-ink" : "bg-divider")}
        >
          <span className={cn("absolute left-1 top-1 size-5 rounded-full bg-surface shadow-soft transition-transform duration-200 motion-reduce:transition-none", annual && "translate-x-5")} />
        </button>
        <span className={cn("font-medium transition-colors", annual ? "text-ink" : "text-muted")}>{labels.annual}</span>
        <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[12.5px] font-semibold text-success">{labels.save}</span>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = ICONS[c.key] ?? Sparkles;
          const href = c.paid ? `/signup?next=${encodeURIComponent(`/settings/billing?plan=${c.key}&interval=${interval}${currency === "eur" ? "&currency=eur" : ""}`)}` : "/signup";
          return (
            <div
              key={c.key}
              className={cn(
                "relative flex flex-col rounded-card bg-surface p-6 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover",
                c.recommended && "ring-2 ring-ink",
              )}
            >
              {c.recommended && (
                <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-gold-light shadow-soft">
                  <Star className="size-3.5 fill-current" aria-hidden />{labels.recommendation}
                </span>
              )}
              <div className="flex items-center gap-2.5">
                <span className={cn("grid size-9 place-items-center rounded-[10px]", c.recommended ? "bg-ink text-gold-light" : "bg-accent-soft text-accent")}><Icon className="size-4.5" aria-hidden /></span>
                <p className="text-[19px] font-semibold text-ink">{c.name}</p>
              </div>
              <p className="mt-2 min-h-10 text-[13.5px] leading-snug text-muted">{c.tagline}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-[2.6rem] font-semibold leading-none tracking-[-0.035em] text-ink">{annual ? c.annual : c.monthly}</span>
                <span className="text-[15px] text-muted">{labels.perMonth}</span>
              </p>
              <p className="mt-2 min-h-5 text-[12.5px] text-muted">{annual ? c.annualNote : c.monthlyNote}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-[14px] text-ink/85">
                {c.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{f}</li>
                ))}
              </ul>
              <Button href={href} variant={c.recommended ? "accent" : "secondary"} className="mt-7 w-full">
                {c.cta}<ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}
