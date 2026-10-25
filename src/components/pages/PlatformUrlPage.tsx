import { ArrowRight } from "lucide-react";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { CtaBand } from "@/components/site/CtaBand";
import { Accordion } from "@/components/site/Accordion";
import { JsonLd } from "@/components/site/JsonLd";
import { LatestPosts } from "@/components/site/HomeSections";

export function PlatformUrlPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = t.platformUrl;
  const L = (x: string) => localizePath(x, locale);
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="label-mono text-muted">{p.eyebrow}</p>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{p.title}</h1>
          <p className="mt-6 max-w-xl text-subtitle text-muted">{p.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="accent" size="lg">{t.common.createFirstAd} <ArrowRight className="size-5" aria-hidden /></Button>
            <Button href={L("/platform/ads")} variant="secondary" size="lg">{p.howAdIsMade}</Button>
          </div>
          <p className="mt-3 text-[13px] text-muted">{t.common.noCard}</p>
        </div>
        <div className="rounded-card bg-surface p-6 shadow-card" aria-hidden>
          <div className="rounded-control border border-border bg-bg px-4 py-3 text-[13px] text-muted">https://yourshop.com/products/…</div>
          <div className="mt-4 space-y-3">
            <div className="h-3 w-2/3 rounded-full bg-ink/80" />
            <div className="h-2.5 w-full rounded-full bg-ink/15" />
            <div className="h-2.5 w-5/6 rounded-full bg-ink/15" />
            <div className="mt-2 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className={`aspect-square rounded-tile bg-surface-muted ${i < 2 ? "ring-2 ring-accent" : ""}`} />)}</div>
          </div>
          <div className="mt-5 inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-white">{p.useDetails}</div>
        </div>
      </section>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.howItWorks} title={p.stepsTitle} />
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={3} items={p.steps} />
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={p.safetyEyebrow} title={p.safetyTitle} />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card"><h3 className="text-[17px] font-semibold">{p.does}</h3><ul className="mt-3 space-y-2 text-[15px] text-ink/85">{p.doesItems.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />{x}</li>)}</ul></div>
          <div className="rounded-card bg-surface p-6 shadow-card"><h3 className="text-[17px] font-semibold">{p.doesNot}</h3><ul className="mt-3 space-y-2 text-[15px] text-ink/85">{p.doesNotItems.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{x}</li>)}</ul></div>
        </div>
      </Reveal>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.faq} title={p.faqTitle} />
        <Accordion items={p.faq} className="mx-auto mt-10 max-w-3xl" />
      </Reveal>
      <LatestPosts locale={locale} categories={["product-video"]} />
      <Reveal as="section"><CtaBand locale={locale} /></Reveal>
    </div>
  );
}
