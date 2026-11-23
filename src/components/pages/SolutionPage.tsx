import { ArrowRight } from "lucide-react";
import type { Solution } from "@/content/solutions";
import { config } from "@/lib/config";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { PageHero } from "@/components/site/PageHero";
import { Accordion } from "@/components/site/Accordion";
import { FinalCta } from "@/components/site/Persuasion";
import { JsonLd } from "@/components/site/JsonLd";
import { LatestPosts } from "@/components/site/HomeSections";

export function SolutionPage({ s, locale }: { s: Solution; locale: Locale }) {
  const t = dict(locale);
  const p = t.solutionsPage;
  const L = (x: string) => localizePath(x, locale);
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageHero
        eyebrow={s.eyebrow}
        title={s.title}
        text={s.intro}
        note={t.common.noCard}
        actions={<>
          <Button href={config.features.ads ? "/signup" : `/signup?next=${encodeURIComponent("/new/translate")}`} variant="accent" size="lg">{config.features.ads ? t.common.createFirstAd : t.common.translateFirst} <ArrowRight className="size-5" aria-hidden /></Button>
          <Button href={L("/demo")} variant="secondary" size="lg">{t.common.bookDemo}</Button>
        </>}
      />
      {/* Problem and help in one card (23 Nov 2026): two cards of matched height left the problem card half empty. */}
      <Reveal as="section" className="grid gap-8 rounded-card bg-surface p-6 shadow-card sm:p-8 md:grid-cols-[1fr_1.5fr] md:gap-10">
        <div>
          <h2 className="label-mono text-muted">{p.problem}</h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink/85">{s.problem.points.map((x) => <li key={x} className="flex items-start gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{x}</li>)}</ul>
        </div>
        <div className="border-t border-divider pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-0">
          <h2 className="label-mono text-muted">{p.helps}</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">{s.helps.map((h) => <li key={h.title}><p className="text-[15px] font-semibold text-ink">{h.title}</p><p className="mt-1 text-[14px] leading-relaxed text-muted">{h.text}</p></li>)}</ul>
        </div>
      </Reveal>
      {s.extra && (
        <Reveal as="section">
          <SectionIntro eyebrow={s.extra.eyebrow} title={s.extra.title} />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {s.extra.items.map((x) => <li key={x.title} className="rounded-card bg-surface p-6 shadow-card"><p className="text-[16px] font-semibold text-ink">{x.title}</p><p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{x.text}</p></li>)}
          </ul>
        </Reveal>
      )}
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.howItWorks} title={s.example.title} />
        <p className="mx-auto mt-3 flex max-w-2xl justify-center"><Badge>{p.exampleBadge}</Badge></p>
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={4} items={s.example.steps.map((x, i) => ({ title: s.example.stepTitles[i] ?? p.step.replace("{n}", String(i + 1)), text: x }))} />
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.faq} title={p.faqTitle.replace("{who}", s.eyebrow.toLowerCase())} />
        <Accordion items={s.faq} className="mx-auto mt-10 max-w-3xl" />
      </Reveal>
      {/* Each audience gets its own reads (s.reads); translation-only while ads are off. */}
      <LatestPosts locale={locale} categories={s.reads ?? (config.features.ads ? ["product-video", "costs-and-process"] : ["translation", "captions-and-formats"])} />
      <FinalCta locale={locale} />
    </div>
  );
}
