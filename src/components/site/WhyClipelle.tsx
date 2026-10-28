import { BadgeCheck, Captions, CircleDollarSign, Infinity as InfinityIcon, ListChecks, LockKeyhole, RotateCcw, ShieldCheck, Smartphone, Sparkles, VideoOff, type LucideIcon } from "lucide-react";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { PLANS, currencyFor, formatMoney, planPrice } from "@/lib/plans";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";

/**
 * "Why Clipelle" (28 Oct 2026, redesign at Tijs's request; patterns after MakeUGC's one dark feature
 * card beside an even grid and Creatify's icon-title-line cards, our own content): one bento block
 * instead of three tabs. The price per translated minute on ink with gold, four small facts, and the
 * promises as a calm list with one short line each, then the choices on the form as one row of chips.
 * Every number is real: the price from plans.ts (a minute on Pro, yearly), the rest product facts.
 */
const STAT_ICONS: LucideIcon[] = [VideoOff, InfinityIcon, Sparkles, Smartphone];
const PROMISE_ICONS: LucideIcon[] = [CircleDollarSign, RotateCcw, ListChecks, ShieldCheck, LockKeyhole, Captions];

export function WhyClipelle({ locale }: { locale: Locale }) {
  const w = dict(locale).home.why;
  const pro = PLANS.find((p) => p.key === "pro")!;
  const currency = currencyFor(locale);
  // One minute of video (60 credits) inside the Pro plan billed yearly (28 Oct 2026, Tijs: what a
  // minute costs on the plan most people take, not loose credits). Real numbers from plans.ts.
  const perMinute = Math.round((planPrice(pro, currency).annualMonthly / pro.creditsPerMonth) * 60 * 100) / 100;
  const price = formatMoney(perMinute, currency, locale);

  return (
    <Reveal as="section">
      <SectionIntro eyebrow={w.eyebrow} title={w.title} text={w.text} />

      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
        {/* The one dark card: the price, in gold on ink (gold only ever on ink). */}
        <div className="relative col-span-2 flex flex-col justify-end overflow-hidden rounded-card bg-ink p-7 text-champagne shadow-card sm:p-9 lg:row-span-2">
          <div className="glow-field gold -right-16 -top-20 h-72 w-72" aria-hidden />
          <p className="relative text-[clamp(3.2rem,7vw,5.25rem)] font-semibold leading-none tracking-[-0.045em] text-gold-light">{price}</p>
          <p className="relative mt-3 text-[20px] font-semibold text-champagne">{w.price.title}</p>
          <p className="relative mt-2 max-w-sm text-[15px] leading-relaxed text-champagne/70">{w.price.text}</p>
        </div>

        {w.stats.map((s, i) => {
          const Icon = STAT_ICONS[i] ?? BadgeCheck;
          return (
            <div key={s.title} className="flex flex-col rounded-card bg-surface p-4 shadow-card sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[30px] font-semibold leading-none tracking-[-0.035em] text-ink sm:text-[38px]">{s.value}</p>
                <span className="hidden size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent sm:grid"><Icon className="size-4" aria-hidden /></span>
              </div>
              <p className="mt-4 text-[14.5px] font-semibold leading-snug text-ink sm:mt-6 sm:text-[16px]">{s.title}</p>
              <p className="mt-1 text-[13px] leading-snug text-muted sm:text-[14px]">{s.text}</p>
            </div>
          );
        })}
      </div>

      {/* Promises: one quiet panel, icon + title + one line, no card per item. */}
      <div className="mt-4 rounded-card bg-surface p-6 shadow-card sm:p-8">
        <p className="label-mono text-muted">{w.promiseTitle}</p>
        <ul className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {w.promise.map((item, i) => {
            const Icon = PROMISE_ICONS[i] ?? BadgeCheck;
            return (
              <li key={item.title} className="flex gap-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-ink text-gold-light"><Icon className="size-4" aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">{item.title}</span>
                  <span className="mt-0.5 block text-[14px] text-muted">{item.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-7 flex flex-col gap-3 border-t border-divider pt-5 sm:flex-row sm:items-center">
          <p className="shrink-0 text-[13px] font-medium text-muted">{w.decideTitle}</p>
          <ul className="flex flex-wrap gap-2">
            {w.decide.map((x) => (
              <li key={x} className="rounded-full bg-surface-muted px-3 py-1 text-[13px] font-medium text-ink">{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}
