import Link from "next/link";
import { ArrowRight, Captions, Clock3, Languages, Palette, ShieldCheck, Smartphone, UserRound, Wallet, type LucideIcon } from "lucide-react";
import { menusFor, type MenuItem } from "@/components/site/siteNav";
import { allPosts } from "@/lib/blog";
import { resolvedExamples } from "@/lib/examples";
import { BlogCard } from "@/components/site/BlogCard";
import { Marquee } from "@/components/site/Marquee";
import { MenuCard } from "@/components/site/MenuCard";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Button } from "@/components/ui/Button";
import { dict } from "@/content/i18n";
import { FORMATS } from "@/content/formats";
import { FormatIllustration } from "@/components/FormatIllustrations";
import { localizePath, type Locale } from "@/lib/i18n";

/** Server-rendered homepage sections that read content: examples marquee, use cases, integrations, blog cards, outcomes. */

export function ExampleMarquee({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  const list = resolvedExamples();
  const items = list.length > 0
    ? list.map((e) => (
        <div key={e.id} className="relative aspect-[9/16] w-[150px] overflow-hidden rounded-tile bg-ink shadow-card">
          <video src={e.src} poster={e.posterSrc} muted loop playsInline autoPlay preload="metadata" aria-label={`${e.title}: ${e.note}`} className="size-full object-cover" />
          <span className="label-mono absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] text-ink">{t.common.sampleMadeWith}</span>
        </div>
      ))
    : [];
  const placeholders = Array.from({ length: Math.max(0, 6 - items.length) }, (_, i) => {
    const f = FORMATS[i % FORMATS.length];
    return (
      <div key={`ph-${i}`} className="relative flex aspect-[9/16] w-[150px] flex-col items-center justify-center gap-3 rounded-tile bg-[linear-gradient(170deg,var(--surface),var(--surface-muted))] shadow-card">
        <FormatIllustration format={f.key} className="h-10 w-14 text-ink/50" />
        <span className="text-[12px] font-medium text-ink/70">{locale === "nl" ? f.nl.name : f.name}</span>
        <span className="label-mono absolute left-2 top-2 rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted shadow-soft">{t.common.sampleComingSoon}</span>
      </div>
    );
  });
  return <Marquee ariaLabel="Example videos" items={[...items, ...placeholders]} className="mt-10" />;
}

const OUTCOME_ICONS: LucideIcon[] = [Clock3, Wallet, Smartphone, Captions, Languages, UserRound, Palette, ShieldCheck];

export function Outcomes({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale).home;
  const outcomes = t.outcomes.map((o, i) => ({ ...o, icon: OUTCOME_ICONS[i] ?? ShieldCheck }));
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={t.outcomesEyebrow} title={t.outcomesTitle} text={t.outcomesText} />
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {outcomes.map(({ icon: Icon, title, text }, i) => (
          <Reveal as="li" key={title} delay={i * 60} className="group rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
            <span className="grid size-11 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--surface),var(--accent-soft))] text-accent ring-1 ring-accent/15 transition-transform duration-200 group-hover:scale-105"><Icon className="size-5" aria-hidden /></span>
            <h3 className="mt-4 text-[17px] font-semibold leading-snug">{title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{text}</p>
          </Reveal>
        ))}
      </ul>
    </Reveal>
  );
}

export function UseCaseCards({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale).home;
  const items = menusFor(locale).find((m) => m.key === "solutions")!.columns.flatMap((c) => c.items);
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={t.solutionsEyebrow} title={t.solutionsTitle} text={t.solutionsText} />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c: MenuItem) => (
          <li key={c.href} className="rounded-card bg-surface shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
            <MenuCard card={c} soonLabel={dict(locale).common.soon} />
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function IntegrationsRow({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale).home;
  const items = menusFor(locale).find((m) => m.key === "platform")!.columns[1].items;
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={t.integrationsEyebrow} title={t.integrationsTitle} />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c: MenuItem) => (
          <li key={c.href} className="rounded-card bg-surface shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
            <MenuCard card={c} soonLabel={dict(locale).common.soon} />
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-[13px] text-muted">{t.integrationsNote}</p>
    </Reveal>
  );
}

export function LatestPosts({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  const posts = allPosts().slice(0, 3);
  if (posts.length === 0) return null;
  return (
    <Reveal as="section">
      <SectionIntro eyebrow={t.home.blogEyebrow} title={t.home.blogTitle} text={t.home.blogText} />
      {locale !== "en" && <p className="mt-3 text-center text-[13px] text-muted">{t.common.articlesEnglish}</p>}
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {posts.map((p) => <BlogCard key={p.slug} post={p} />)}
      </div>
      <div className="mt-8 text-center">
        <Button href="/blog" variant="secondary">{t.home.allArticles} <ArrowRight className="size-4" aria-hidden /></Button>
      </div>
    </Reveal>
  );
}

export function MidCta({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  return (
    <Reveal as="section" className="relative overflow-hidden rounded-card bg-ink px-6 py-12 text-center text-surface sm:py-14">
      <div className="glow-field left-[-6%] top-[-30%] h-64 w-64 bg-accent opacity-30" aria-hidden />
      <div className="glow-field warm right-[-6%] bottom-[-40%] h-72 w-72 opacity-25" aria-hidden />
      <div className="bg-dots absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)]" aria-hidden />
      <h2 className="relative text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em]">{t.midCta.title}</h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-surface/70">{t.midCta.text}</p>
      <div className="mt-7 flex justify-center">
        <Button href="/signup" variant="accent" size="lg">{t.common.createFirstAd} <ArrowRight className="size-5" aria-hidden /></Button>
      </div>
      <p className="mt-3 text-[13px] text-surface/60">{t.common.noCard}</p>
      <p className="mt-6 text-[13px] text-surface/60"><Link href={localizePath("/examples", locale)} className="underline decoration-surface/30 underline-offset-4 hover:decoration-surface">{t.midCta.examplesFirst}</Link></p>
    </Reveal>
  );
}
