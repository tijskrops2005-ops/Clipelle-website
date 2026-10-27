import { ArrowRight } from "lucide-react";
import { config } from "@/lib/config";
import { IntegrationPage } from "@/components/site/IntegrationPage";
import { WaitlistForm } from "@/components/site/WaitlistForm";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { FinalCta } from "@/components/site/Persuasion";
import { Accordion } from "@/components/site/Accordion";
import { JsonLd } from "@/components/site/JsonLd";
import { LatestPosts } from "@/components/site/HomeSections";
import { firstExample } from "@/lib/examples";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { AdSketch, HeroStage } from "@/components/site/Sketches";

export function PlatformUrlPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = t.platformUrl;
  const L = (x: string) => localizePath(x, locale);
  if (!config.features.ads) {
    return (
      <IntegrationPage locale={locale} soon eyebrow={p.eyebrow} title={p.title} intro={p.intro} steps={p.steps} does={p.doesItems} doesNot={p.doesNotItems} secondary={{ href: L("/platform/translate"), label: p.soon.translateInstead }}>
        <div className="mt-8 rounded-card bg-surface p-6 shadow-card"><p className="text-[15px] font-semibold text-ink">{t.integrations.waitlistTitle}</p><p className="mb-4 mt-1 text-[13px] text-muted">{t.integrations.waitlistText}</p><WaitlistForm feature="url-to-video" label={p.soon.label} locale={locale} /></div>
      </IntegrationPage>
    );
  }
  const sample = firstExample("ad");
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
        {/* 25 Oct 2026: the real ad from our own run instead of a grey sketch of the form. */}
        <HeroStage label={t.common.illustration}>
          {sample ? <PhoneFrame src={sample.src} poster={sample.posterSrc} caption={t.common.sampleMadeWith} placeholder={t.common.sampleComingSoon} /> : <div className="float-soft w-[240px] sm:w-[260px]"><AdSketch label={t.common.illustration} /></div>}
        </HeroStage>
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
      <FinalCta locale={locale} />
    </div>
  );
}
