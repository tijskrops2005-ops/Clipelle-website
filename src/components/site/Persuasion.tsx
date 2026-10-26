import type { CSSProperties } from "react";
import { AppWindow, ArrowRight, BadgeCheck, Check, Briefcase, Building2, CircleDollarSign, Clapperboard, Infinity as InfinityIcon, ListChecks, LockKeyhole, ShieldCheck, Shirt, Sofa, Sparkles, Store, Tag, Truck, type LucideIcon } from "lucide-react";
import { TRANSLATE_LANGUAGES } from "@/lib/translateLanguages";
import { resolveExampleFile } from "@/lib/examples";
import { translationShowcase } from "@/content/translationShowcase";
import { LazyVideo } from "@/components/site/LazyVideo";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { CountUp } from "@/components/motion/CountUp";
import { cn } from "@/lib/utils";

/**
 * Persuasion blocks for the homepage (25 Oct 2026, motion after reign.com, content only ours and
 * true): a wall of the real 190 translation languages in rows running both ways, a ticker of
 * product facts, the trust grid (no personal details: those stay in the footer and legal pages) and a closing band with falling language codes in gold.
 */

/* ---------- built for (25 Oct 2026: the kinds of sellers, instead of a wall of other companies' logos) ---------- */

const BUILT_FOR_ICONS: LucideIcon[] = [Store, Tag, Truck, Briefcase, Shirt, Sofa, AppWindow, Clapperboard];

export function BuiltFor({ locale }: { locale: Locale }) {
  const h = dict(locale).home;
  return (
    <Reveal as="section" className="text-center">
      <SectionIntro eyebrow={h.builtForEyebrow} title={h.builtForTitle} text={h.builtForText} />
      <ul className="mx-auto mt-9 flex max-w-4xl flex-wrap justify-center gap-2.5">
        {h.builtFor.map((label, i) => {
          const Icon = BUILT_FOR_ICONS[i] ?? Sparkles;
          return (
            <Reveal as="li" key={label} delay={i * 50} className="group flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-[14px] font-medium text-ink shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card">
              <Icon className="size-4 text-accent transition-transform duration-200 group-hover:scale-110" aria-hidden />
              {label}
            </Reveal>
          );
        })}
      </ul>
      <p className="mt-6 text-[14px] text-muted">
        <span className="font-medium text-ink">{h.madeForLabel}</span>{" "}
        {h.madeFor.map((f, i) => (
          <span key={f}>{i > 0 && <span aria-hidden className="mx-2 text-border">/</span>}{f}</span>
        ))}
      </p>
    </Reveal>
  );
}

/* ---------- language wall ---------- */

export function LanguageWall({ locale }: { locale: Locale }) {
  const labels = TRANSLATE_LANGUAGES.map((l) => l.label);
  const rows = [0, 1, 2].map((r) => labels.filter((_, i) => i % 3 === r).slice(0, 34));
  return (
    <div className="relative mt-8 overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]" aria-label={locale === "nl" ? "190 talen en regionale varianten" : "190 languages and regional variants"} role="img">
      <div className="space-y-2.5" aria-hidden>
        {rows.map((row, r) => (
          <div key={r} className="marquee overflow-hidden">
            <div className={cn("marquee-track slow gap-2.5", r === 1 && "reverse")}>
              {[...row, ...row].map((l, i) => (
                <span key={`${l}-${i}`} className="shrink-0 rounded-full border border-border bg-surface px-4 py-1.5 text-[13.5px] text-ink/75 shadow-soft">{l}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* the number in the middle */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="glass rounded-card px-8 py-4 text-center shadow-card-hover">
          <p className="text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none tracking-[-0.03em] text-ink"><CountUp value={190} duration={1400} /></p>
          <p className="mt-1 text-[13px] font-medium text-muted">{locale === "nl" ? "talen en regionale varianten" : "languages and regional variants"}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- facts ticker ---------- */

export function FactsTicker({ items }: { items: string[] }) {
  return (
    <div className="relative -mx-4 overflow-hidden border-y border-ink/10 bg-ink py-3 text-champagne sm:-mx-6 sm:rounded-card sm:border-0" aria-label={items.join(" · ")} role="img">
      <div className="marquee" aria-hidden>
        <div className="marquee-track gap-8">
          {[...items, ...items].map((x, i) => (
            <span key={i} className="flex shrink-0 items-center gap-2 text-[13px] font-medium">
              <Sparkles className="size-3.5 text-gold-light" />
              {x}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- trust grid ---------- */

const TRUST_ICONS: LucideIcon[] = [ShieldCheck, LockKeyhole, CircleDollarSign, ListChecks, InfinityIcon, Building2];

export function TrustGrid({ locale }: { locale: Locale }) {
  const h = dict(locale).home;
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={locale === "nl" ? "Vertrouwen" : "Trust"} title={h.trustTitle} text={h.trustText} />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {h.trust.map((item, i) => {
          const Icon = TRUST_ICONS[i] ?? BadgeCheck;
          return (
            <Reveal as="li" key={item.title} delay={i * 70} className="group flex gap-4 rounded-card bg-surface p-5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-ink text-gold-light transition-transform duration-200 group-hover:scale-105"><Icon className="size-5" aria-hidden /></span>
              <span>
                <span className="block text-[15px] font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{item.text}</span>
              </span>
            </Reveal>
          );
        })}
      </ul>
    </Reveal>
  );
}

/* ---------- closing band with falling language codes ---------- */

const CODES = ["EN", "NL", "DE", "FR", "ES", "IT", "PT", "PL", "SV", "DA", "FI", "CS", "SK", "TR", "AR", "HI", "JA", "KO", "ZH", "EL", "RO", "HU", "NO", "UK"];

export function FinalCta({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  const h = t.home;
  // Fixed positions and timings (no randomness): the same on the server and in the browser.
  const drops = CODES.map((code, i) => ({ code, left: `${(i * 41) % 100}%`, dur: `${8 + (i % 5) * 1.6}s`, delay: `${-((i * 1.7) % 9)}s`, o: i % 4 === 0 ? 0.55 : 0.28, size: i % 3 === 0 ? 15 : 12 }));
  const original = resolveExampleFile(translationShowcase.original.file);
  const result = resolveExampleFile(translationShowcase.result.file);
  return (
    <Reveal as="section" className="relative overflow-hidden rounded-card bg-ink px-6 py-14 sm:px-12 sm:py-16">
      <div className="glow-field gold -left-16 -top-24 h-80 w-80" aria-hidden />
      <div className="glow-field gold-deep -bottom-28 -right-16 h-96 w-96" aria-hidden />
      {/* fainter on phones, where the codes fall behind the text */}
      <div className="fall pointer-events-none absolute inset-0 opacity-40 sm:opacity-60" aria-hidden>
        {drops.map((d) => (
          <span key={d.code} className="font-mono font-semibold text-gold-light" style={{ left: d.left, fontSize: d.size, "--dur": d.dur, "--delay": d.delay, "--o": d.o } as CSSProperties}>{d.code}</span>
        ))}
      </div>
      <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="text-center lg:text-left">
          <h2 className="mx-auto max-w-xl text-balance text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-champagne lg:mx-0">{h.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-champagne/70 lg:mx-0">{h.finalText}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Button href="/signup" variant="accent" size="lg">{t.common.startFree}<ArrowRight className="size-5" aria-hidden /></Button>
            <Button href={localizePath("/demo", locale)} variant="secondary" size="lg" className="border-champagne/20 bg-champagne/10 text-champagne hover:bg-champagne/20">{t.common.bookDemo}</Button>
          </div>
          <ul className="mt-7 flex flex-col items-center gap-2.5 text-[14px] text-champagne/85 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 lg:justify-start">
            {h.finalPoints.map((p) => <li key={p} className="flex items-center gap-2"><Check className="size-4 text-gold-light" aria-hidden />{p}</li>)}
          </ul>
        </div>
        {/* The real translation from the top of the page, small: the original and the Dutch result. */}
        {original && result && (
          <div className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center sm:h-[340px] sm:w-[340px]" aria-hidden>
            <div className="absolute left-0 top-6 w-[132px] -rotate-6 sm:w-[150px]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border-[4px] border-champagne/20 bg-ink shadow-card-hover">
                <LazyVideo src={original} poster={resolveExampleFile(translationShowcase.original.poster) ?? undefined} label="" />
                <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-ink">{translationShowcase.original.code}</span>
              </div>
            </div>
            <div className="absolute right-0 top-0 w-[150px] rotate-3 sm:w-[170px]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border-[4px] border-gold-light/60 bg-ink shadow-card-hover">
                <LazyVideo src={result} poster={resolveExampleFile(translationShowcase.result.poster) ?? undefined} label="" />
                <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">{translationShowcase.result.code}</span>
              </div>
            </div>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-champagne px-3 py-1.5 text-[12px] font-semibold text-ink shadow-card">{translationShowcase.original.code} → {translationShowcase.result.code}</span>
          </div>
        )}
      </div>
    </Reveal>
  );
}
