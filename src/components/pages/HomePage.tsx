import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import { config } from "@/lib/config";
import { firstExample } from "@/lib/examples";
import { faq } from "@/content/faq";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { realAd } from "@/content/realOutput";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { PhoneFrame } from "@/components/site/PhoneFrame";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Tabs } from "@/components/site/Tabs";
import { TrustBlocks } from "@/components/site/TrustBlocks";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";
import { PricingPreview } from "@/components/site/PricingPreview";
import { RealOutput } from "@/components/site/RealOutput";
import { SavingsCalculator } from "@/components/site/SavingsCalculator";
import { ExampleMarquee, IntegrationsRow, LatestPosts, MidCta, Outcomes, UseCaseCards } from "@/components/site/HomeSections";
import { JsonLd } from "@/components/site/JsonLd";
import { faqFor } from "@/content/faqI18n";

/** The homepage in one language. Route files render it with locale "en" (/) or "nl" (/nl). */
export function HomePage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const h = t.home;
  const L = (p: string) => localizePath(p, locale);
  const heroSample = firstExample("ad");
  const translateSample = firstExample("translate");
  const questions = faqFor(locale, faq).slice(0, 6);
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: config.productName, url: absoluteUrl("/"), logo: absoluteUrl("/opengraph-image") }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: config.productName, url: absoluteUrl("/") }} />
      <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="label-mono text-muted">{h.eyebrow}</p>
          <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">{h.title}</h1>
          <p className="mt-6 max-w-xl text-subtitle text-muted">{h.intro}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" variant="accent" size="lg"><Sparkles className="size-5" aria-hidden />{t.common.createFirstAd}</Button>
            <Button href={L("/examples")} variant="secondary" size="lg">{t.common.seeExamples}<ArrowRight className="size-5" aria-hidden /></Button>
          </div>
          <p className="mt-4 text-[13px] text-muted">{t.common.noCardLong}</p>
        </div>
        <PhoneFrame src={heroSample?.src} poster={heroSample?.posterSrc} caption={t.common.sampleMadeWith} placeholder={t.common.sampleComingSoon} />
      </section>

      <Reveal as="section">
        <SectionIntro eyebrow={h.whatEyebrow} title={h.whatTitle} text={h.whatText} />
        <Tabs
          className="mt-10"
          tabs={[
            { key: "ads", label: h.tabs.ads.label, content: <TabPanel title={h.tabs.ads.title} text={h.tabs.ads.text} points={h.tabs.ads.points} link={{ href: L("/platform/ads"), label: h.tabs.ads.link }} aside={<PhoneFrame src={heroSample?.src} float={false} className="w-[200px]" caption={t.common.sampleMadeWith} placeholder={t.common.sampleComingSoon} />} /> },
            { key: "url", label: h.tabs.url.label, content: <TabPanel title={h.tabs.url.title} text={h.tabs.url.text} points={h.tabs.url.points} link={{ href: L("/platform/url-to-video"), label: h.tabs.url.link }} aside={<UrlSketch />} /> },
            { key: "translate", label: h.tabs.translate.label, content: <TabPanel title={h.tabs.translate.title} text={h.tabs.translate.text} points={h.tabs.translate.points} link={{ href: L("/platform/translate"), label: h.tabs.translate.link }} aside={<PhoneFrame src={translateSample?.src} poster={translateSample?.posterSrc} float={false} className="w-[200px]" words={["Hallo", "wereld"]} caption={t.common.sampleMadeWith} placeholder={t.common.sampleComingSoon} />} /> },
          ]}
        />
      </Reveal>

      <Reveal as="section" className="scroll-mt-24">
        <SectionIntro eyebrow={t.common.howItWorks} title={h.stepsTitle} text={h.stepsText} />
        <StepList items={h.steps} columns={3} className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" />
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow={h.examplesEyebrow} title={h.examplesTitle} text={h.examplesText} />
        <ExampleMarquee locale={locale} />
        <div className="mt-8 text-center"><Button href={L("/examples")} variant="secondary">{t.common.allExamples} <ArrowRight className="size-4" aria-hidden /></Button></div>
      </Reveal>

      <RealOutput data={realAd} kind="ad" locale={locale} />
      <MidCta locale={locale} />
      <Outcomes locale={locale} />
      <UseCaseCards locale={locale} />
      <IntegrationsRow locale={locale} />

      <Reveal as="section">
        <SectionIntro eyebrow={h.compareEyebrow} title={h.compareTitle} text={h.compareText} />
        <div className="mt-10"><SavingsCalculator compact locale={locale} /></div>
      </Reveal>

      <TrustBlocks />

      <Reveal as="section">
        <SectionIntro eyebrow={h.pricingEyebrow} title={h.pricingTitle} text={h.pricingText} />
        <PricingPreview className="mt-10" locale={locale} />
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow={t.common.faq} title={h.faqTitle} />
        <Accordion items={questions} className="mx-auto mt-10 max-w-3xl" />
        <p className="mt-6 text-center text-[15px] text-muted"><a href={L("/resources/faq")} className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">{h.allQuestions}</a></p>
      </Reveal>

      <LatestPosts locale={locale} />

      <Reveal as="section"><CtaBand locale={locale} /></Reveal>

      <p className="flex items-center justify-center gap-2 text-[13px] text-muted"><Clock3 className="size-4" aria-hidden /> {h.readyLine}</p>
    </div>
  );
}

function TabPanel({ title, text, points, link, aside }: { title: string; text: string; points: string[]; link: { href: string; label: string }; aside: React.ReactNode }) {
  return (
    <div className="grid items-center gap-10 rounded-card bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_auto]">
      <div>
        <h3 className="text-title">{title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{text}</p>
        <ul className="mt-5 space-y-2 text-[15px] text-ink/85">
          {points.map((p) => <li key={p} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" aria-hidden />{p}</li>)}
        </ul>
        <Button href={link.href} variant="link" className="mt-5">{link.label} <ArrowRight className="size-4" aria-hidden /></Button>
      </div>
      {aside}
    </div>
  );
}

function UrlSketch() {
  return (
    <div className="w-[220px] rounded-card bg-bg p-4 shadow-card" aria-hidden>
      <div className="rounded-control border border-border bg-surface px-3 py-2 text-[11px] text-muted">https://yourshop.com/…</div>
      <div className="mt-3 h-2.5 w-3/4 rounded-full bg-ink/80" />
      <div className="mt-2 h-2 w-full rounded-full bg-ink/15" />
      <div className="mt-1.5 h-2 w-5/6 rounded-full bg-ink/15" />
      <div className="mt-3 grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <div key={i} className={`aspect-square rounded-[6px] bg-surface-muted ${i < 2 ? "ring-2 ring-accent" : ""}`} />)}</div>
    </div>
  );
}
