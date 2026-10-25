import { ArrowRight, ImageUp, Link2, Sparkles } from "lucide-react";
import { Fragment, Suspense, type CSSProperties } from "react";
import { config } from "@/lib/config";
import { faq } from "@/content/faq";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Accordion } from "@/components/site/Accordion";
import { PricingPreview } from "@/components/site/PricingPreview";
import { SavingsCalculator } from "@/components/site/SavingsCalculator";
import { ExampleMarquee, Outcomes, UseCaseCards } from "@/components/site/HomeSections";
import { JsonLd } from "@/components/site/JsonLd";
import { PipelineStrip, ProofChips } from "@/components/site/Sketches";
import { AdsPanel, ChoicesChips, FeatureRows, HeroShowcase, StatsBand, UrlPanel } from "@/components/site/Showcase";
import { TranslateShowcase } from "@/components/site/TranslateShowcase";
import { ProductDemo } from "@/components/site/ProductDemo";
import { BuiltFor, FactsTicker, FinalCta, TrustGrid } from "@/components/site/Persuasion";
import { HomeLogos, HomeReviews } from "@/components/site/HomeTrust";
import { faqFor } from "@/content/faqI18n";

/**
 * The homepage in one language (route files render it with "en" at / and "nl" at /nl). Order since
 * 24 Oct 2026, translation first because it is the strongest part: hero → translation pipeline →
 * the same video in two languages → translation stats → ads from a photo or a link → outcomes →
 * choices → who it is for → try it → our samples → trust → compare → pricing → FAQ → closing band (25 Oct: + facts ticker, product demo, trust grid, falling-codes closing band; the dark "Try it" band moved into that closing band). Articles sit on the platform, solution, pricing and examples pages.
 */
export function HomePage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const h = t.home;
  const L = (p: string) => localizePath(p, locale);
  const questions = faqFor(locale, faq).slice(0, 6);
  const words = h.showcaseWords;
  return (
    <div className="space-y-24 sm:space-y-32">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: config.productName, url: absoluteUrl("/"), logo: absoluteUrl("/brand/clipelle-logo-dark.png") }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: config.productName, url: absoluteUrl("/") }} />

      {/* Hero: centred copy, one accent button, the fanned row of 9:16 tiles, then the translation steps. */}
      <section className="pt-14 text-center sm:pt-20">
        <p className="label-mono text-muted">{h.eyebrow}</p>
        <h1 className="word-in mx-auto mt-5 max-w-4xl text-[clamp(2.6rem,6.4vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
          {h.title.split(" ").map((w, i, all) => (
            <Fragment key={i}>
              <span style={{ "--i": i } as CSSProperties}>{w}</span>
              {i < all.length - 1 ? " " : null}
            </Fragment>
          ))}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-subtitle text-muted">{h.intro}</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/signup" variant="accent" size="lg"><Sparkles className="size-5" aria-hidden />{t.common.createFirstAd}</Button>
          <Button href={L("/examples")} variant="secondary" size="lg">{t.common.seeExamples}<ArrowRight className="size-5" aria-hidden /></Button>
        </div>
        <p className="mt-4 text-[13px] text-muted">{t.common.noCardLong}</p>
        <ProofChips items={h.proof} className="mt-6 justify-center" />
        <HeroShowcase words={words} illustrationLabel={t.common.illustration} sampleLabel={t.common.sampleMadeWith} className="mt-12 sm:mt-14" />
        <PipelineStrip labels={h.translate.pipeline} className="mt-6" />
      </section>

      <BuiltFor locale={locale} />
      <HomeLogos locale={locale} />

      <TranslateShowcase locale={locale} />

      <StatsBand items={h.translate.stats} className="-mt-10 sm:-mt-16" />

      <FactsTicker items={h.ticker} />

      <ProductDemo locale={locale} />

      <Reveal as="section">
        <SectionIntro eyebrow={h.moreEyebrow} title={h.moreTitle} text={h.moreText} />
        <FeatureRows
          className="mt-14"
          rows={[
            { key: "ads", label: h.tabs.ads.label, title: h.tabs.ads.title, text: h.tabs.ads.text, points: h.tabs.ads.points, link: { href: L("/platform/ads"), label: h.tabs.ads.link }, icon: ImageUp, panel: <AdsPanel label={t.common.illustration} words={[words[0], words[1], words[2]]} /> },
            { key: "url", label: h.tabs.url.label, title: h.tabs.url.title, text: h.tabs.url.text, points: h.tabs.url.points, link: { href: L("/platform/url-to-video"), label: h.tabs.url.link }, icon: Link2, panel: <UrlPanel label={t.common.illustration} words={words[3]} /> },
          ]}
        />
      </Reveal>

      <Outcomes locale={locale} />
      <HomeReviews locale={locale} />
      <ChoicesChips eyebrow={h.choicesEyebrow} title={h.choicesTitle} text={h.choicesText} items={h.choices} />
      <UseCaseCards locale={locale} />

      <Reveal as="section">
        <SectionIntro eyebrow={h.examplesEyebrow} title={h.examplesTitle} text={h.examplesText} />
        <ExampleMarquee locale={locale} />
        <div className="mt-8 text-center"><Button href={L("/examples")} variant="secondary">{t.common.allExamples} <ArrowRight className="size-4" aria-hidden /></Button></div>
      </Reveal>

      <TrustGrid locale={locale} />

      <Reveal as="section">
        <SectionIntro eyebrow={h.compareEyebrow} title={h.compareTitle} text={h.compareText} />
        <div className="mt-10"><Suspense fallback={<div className="min-h-64" aria-hidden />}><SavingsCalculator compact locale={locale} /></Suspense></div>
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow={h.pricingEyebrow} title={h.pricingTitle} text={h.pricingText} />
        <PricingPreview className="mt-10" locale={locale} />
      </Reveal>

      <Reveal as="section">
        <SectionIntro eyebrow={t.common.faq} title={h.faqTitle} />
        <Accordion items={questions} className="mx-auto mt-10 max-w-3xl" />
        <p className="mt-6 text-center text-[15px] text-muted"><a href={L("/resources/faq")} className="focus-ring rounded-control underline decoration-border underline-offset-4 hover:decoration-ink">{h.allQuestions}</a></p>
      </Reveal>

      <FinalCta locale={locale} />
    </div>
  );
}
