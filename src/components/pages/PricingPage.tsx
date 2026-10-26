import { pricingFaqFor } from "@/content/pricingFaq";
import { Suspense } from "react";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { SectionIntro } from "@/components/site/SectionIntro";
import { PricingTable } from "@/components/site/PricingTable";
import { Accordion } from "@/components/site/Accordion";
import { FinalCta } from "@/components/site/Persuasion";
import { ServiceSection } from "@/components/site/ServiceSection";
import { JsonLd } from "@/components/site/JsonLd";
import { LatestPosts } from "@/components/site/HomeSections";

export function PricingPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const faq = pricingFaqFor(locale);
  return (
    <div className="space-y-24 pt-16 sm:pt-24">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <SectionIntro eyebrow={t.pricing.eyebrow} title={t.pricing.title} text={t.pricing.text} />
      <Suspense fallback={<div className="min-h-64" aria-hidden />}><PricingTable locale={locale} /></Suspense>
      <ServiceSection locale={locale} />
      <section>
        <SectionIntro eyebrow={t.common.faq} title={t.pricing.faqTitle} />
        <Accordion items={faq} className="mx-auto mt-10 max-w-3xl" />
      </section>
      <LatestPosts locale={locale} categories={["costs-and-process"]} />
      <FinalCta locale={locale} />
    </div>
  );
}
