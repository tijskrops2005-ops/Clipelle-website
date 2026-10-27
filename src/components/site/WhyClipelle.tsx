import { AudioLines, Coins, BadgeCheck, CircleDollarSign, Clock3, Compass, Gauge, Image as ImageIcon, Infinity as InfinityIcon, Languages, ListChecks, LockKeyhole, Mic, Palette, RotateCcw, Scissors, ShieldCheck, Smartphone, Smile, Sparkles, Stamp, Tag, Captions, UserRound, VideoOff, FileCheck, type LucideIcon } from "lucide-react";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { measured } from "@/content/measured";
import { config } from "@/lib/config";
import { PLANS, currencyFor, formatMoney, usdPerTranslateMinute } from "@/lib/plans";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { SwipeTabs } from "@/components/site/SwipeTabs";

/**
 * "Why Clipelle" (25 Oct 2026, at Tijs's request): the outcomes, the choices and the trust grid in
 * one swipeable block, so the homepage is shorter. Every number is real: the measured minutes come
 * from src/content/measured.ts, the price per minute from plans.ts (Pro, monthly). 26 Oct 2026: the
 * cards no longer repeat the language count or the translation time shown higher up the page.
 */

const GET_ICONS: LucideIcon[] = [CircleDollarSign, VideoOff, InfinityIcon, Coins, Sparkles, Smartphone];
const PROMISE_ICONS: LucideIcon[] = [CircleDollarSign, RotateCcw, ListChecks, InfinityIcon, ShieldCheck, LockKeyhole];
const TRANSLATE_ICONS: LucideIcon[] = [Languages, Gauge, Tag, Smartphone, Captions, Scissors, ImageIcon];
const AD_ICONS: LucideIcon[] = [Clock3, UserRound, Languages, Mic, Smile, Tag, Compass, ImageIcon, Captions, Palette, Stamp, FileCheck];

const fmt = (n: number | null) => (n == null ? "–" : String(n).replace(".", ","));

export function WhyClipelle({ locale }: { locale: Locale }) {
  const w = dict(locale).home.why;
  const pro = PLANS.find((p) => p.key === "pro")!;
  const currency = currencyFor(locale);
  const price = formatMoney(usdPerTranslateMinute(pro, currency), currency, locale);
  const num = (n: number | null) => (locale === "nl" ? fmt(n) : n == null ? "–" : String(n));
  const fill = (v: string) => v.replace("{t}", num(measured.translationMinutes)).replace("{a}", num(measured.adMinutes)).replace("{price}", price);

  const get = (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {w.get.filter((g) => config.features.ads || !g.value.includes("{a}")).map((g, i) => {
        const Icon = GET_ICONS[i] ?? BadgeCheck;
        return (
          <li key={g.title} className="rounded-card bg-surface p-4 shadow-card sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[clamp(1.45rem,3.4vw,2.6rem)] font-semibold leading-none tracking-[-0.035em] text-ink">{fill(g.value)}</p>
              <span className="hidden size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent sm:grid"><Icon className="size-4" aria-hidden /></span>
            </div>
            <h3 className="mt-3 text-[14px] font-semibold leading-snug sm:mt-4 sm:text-[16px]">{g.title}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted sm:text-[14px]">{g.text}</p>
          </li>
        );
      })}
    </ul>
  );

  const chips = (items: string[], icons: LucideIcon[]) => (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((x, i) => {
        const Icon = icons[i] ?? AudioLines;
        return (
          <li key={x} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[14px] font-medium text-ink shadow-soft">
            <Icon className="size-4 text-accent" aria-hidden />{x}
          </li>
        );
      })}
    </ul>
  );
  const decide = (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-card bg-surface p-6 shadow-card">
        <h3 className="text-[16px] font-semibold">{w.decideTranslate}</h3>
        {chips(w.decideTranslateItems, TRANSLATE_ICONS)}
      </div>
      {config.features.ads && (
        <div className="rounded-card bg-surface p-6 shadow-card">
          <h3 className="text-[16px] font-semibold">{w.decideAd}</h3>
          {chips(w.decideAdItems, AD_ICONS)}
        </div>
      )}
      <p className="text-center text-[14px] text-muted lg:col-span-2">{w.decideNote}</p>
    </div>
  );

  const promise = (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {w.promise.map((item, i) => {
        const Icon = PROMISE_ICONS[i] ?? BadgeCheck;
        return (
          <li key={item.title} className="flex gap-4 rounded-card bg-surface p-5 shadow-card">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-ink text-gold-light"><Icon className="size-5" aria-hidden /></span>
            <span>
              <span className="block text-[15px] font-semibold text-ink">{item.title}</span>
              <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{item.text}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <Reveal as="section">
      <SectionIntro eyebrow={w.eyebrow} title={w.title} text={w.text} />
      <SwipeTabs
        className="mt-10"
        hint={w.swipeHint}
        tabs={[
          { key: "get", label: w.tabs.get, content: get },
          { key: "decide", label: w.tabs.decide, content: decide },
          { key: "promise", label: w.tabs.promise, content: promise },
        ]}
      />
    </Reveal>
  );
}
