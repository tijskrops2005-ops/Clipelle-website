import { ArrowRight } from "lucide-react";
import type { Solution } from "@/content/solutions";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";
import { JsonLd } from "@/components/site/JsonLd";

export function SolutionPage({ s, locale }: { s: Solution; locale: Locale }) {
  const t = dict(locale);
  const p = t.solutionsPage;
  const L = (x: string) => localizePath(x, locale);
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <section className="pt-16 sm:pt-24">
        <p className="label-mono text-muted">{s.eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{s.title}</h1>
        <p className="mt-6 max-w-2xl text-subtitle text-muted">{s.intro}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/signup" variant="accent" size="lg">{t.common.createFirstAd} <ArrowRight className="size-5" aria-hidden /></Button>
          <Button href={L("/demo")} variant="secondary" size="lg">{t.common.bookDemo}</Button>
        </div>
        <p className="mt-3 text-[13px] text-muted">{t.common.noCard}</p>
      </section>
      <Reveal as="section" className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <div className="rounded-card bg-surface p-6 shadow-card">
          <h2 className="text-[17px] font-semibold">{p.problem}</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-ink/85">{s.problem.points.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{x}</li>)}</ul>
        </div>
        <div className="rounded-card bg-surface p-6 shadow-card">
          <h2 className="text-[17px] font-semibold">{p.helps}</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">{s.helps.map((h) => <li key={h.title}><p className="text-[15px] font-semibold text-ink">{h.title}</p><p className="mt-1 text-[14px] leading-relaxed text-muted">{h.text}</p></li>)}</ul>
        </div>
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={p.exampleEyebrow} title={s.example.title.split(" (")[0]} />
        <p className="mx-auto mt-3 flex max-w-2xl justify-center"><Badge tone="warning">{p.exampleBadge}</Badge></p>
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={4} items={s.example.steps.map((x, i) => ({ title: p.step.replace("{n}", String(i + 1)), text: x }))} />
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.faq} title={p.faqTitle.replace("{who}", s.eyebrow.toLowerCase())} />
        <Accordion items={s.faq} className="mx-auto mt-10 max-w-3xl" />
      </Reveal>
      <Reveal as="section"><CtaBand locale={locale} /></Reveal>
    </div>
  );
}
