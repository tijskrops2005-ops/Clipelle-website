"use client";

import { useState } from "react";
import { BillingSwitch } from "@/components/ui/BillingSwitch";
import { CreditsSelect } from "@/components/ui/CreditsSelect";
import { ArrowRight, Check, Gem, Lock, Rocket, Sparkles, Star, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { Currency } from "@/lib/plans";

export type PreviewLevel = {
  key: string;
  label: string;
  monthly: string;
  annual: string;
  monthlyNote: string;
  annualNote: string;
};

export type PreviewCard = {
  key: string;
  name: string;
  tagline: string;
  levels: PreviewLevel[];
  everythingIn: string | null;
  features: string[];
  locked: { text: string; plan: string }[];
  recommended: boolean;
  cta: string;
  paid: boolean;
};

type Labels = { monthly: string; annual: string; save: string; billingLabel: string; perMonth: string; recommendation: string; level: string; terms: string };

const ICONS: Record<string, LucideIcon> = { free: Zap, starter: Sparkles, pro: Rocket, scale: Gem };

/** The interactive part of the homepage pricing block: the billing switch and the four cards. */
export function PricingCards({ cards, labels, currency = "usd" }: { cards: PreviewCard[]; labels: Labels; currency?: Currency }) {
  const [annual, setAnnual] = useState(true);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const interval = annual ? "annual" : "monthly";
  return (
    <>
      <BillingSwitch annual={annual} onChange={setAnnual} labels={labels} />
      <p className="mt-3 text-center text-[13px] text-muted">{labels.terms}</p>

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = ICONS[c.key] ?? Sparkles;
          const lv = c.levels.find((l) => l.key === picked[c.key]) ?? c.levels[0];
          const href = c.paid ? `/signup?next=${encodeURIComponent(`/settings/billing?plan=${lv.key}&interval=${interval}${currency === "eur" ? "&currency=eur" : ""}`)}` : "/signup";
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
                <span className="text-[2.6rem] font-semibold leading-none tracking-[-0.035em] text-ink">{annual ? lv.annual : lv.monthly}</span>
                <span className="text-[15px] text-muted">{labels.perMonth}</span>
              </p>
              <p className="mt-2 truncate text-[12.5px] text-muted">{annual ? lv.annualNote : lv.monthlyNote}</p>
              <div className="mt-4">
                <CreditsSelect label={labels.level} options={c.levels.map((l) => ({ key: l.key, label: l.label, hint: `${annual ? l.annual : l.monthly}${labels.perMonth}` }))} value={lv.key} onChange={(k) => setPicked((p) => ({ ...p, [c.key]: k }))} />
              </div>
              <Button href={href} variant={c.recommended ? "accent" : "secondary"} className="mt-4 w-full">
                {c.cta}<ArrowRight className="size-4" aria-hidden />
              </Button>
              <div className="mt-4 flex-1 border-t border-divider pt-4">
                {c.everythingIn && <p className="mb-2 text-[13px] font-semibold text-ink">{c.everythingIn}</p>}
                <ul className="space-y-2.5 text-[14px] text-ink/85">
                  {c.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{f}</li>
                  ))}
                  {c.locked.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-muted"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{f.text}<span className="block text-[12px] text-muted/80">{f.plan}</span></span></li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
