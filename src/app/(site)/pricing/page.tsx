import type { Metadata } from "next";
import { pricingFaq } from "@/content/pricingFaq";
import { absoluteUrl } from "@/lib/site";
import { SectionIntro } from "@/components/site/SectionIntro";
import { PricingTable } from "@/components/site/PricingTable";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";
import { ServiceSection } from "@/components/site/ServiceSection";
import { SavingsCalculator } from "@/components/site/SavingsCalculator";
import { JsonLd } from "@/components/site/JsonLd";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = { title: "Pricing", description: "Plans with monthly credits that never expire, a Business plan for teams, credit packs, the API on every paid plan, and one free ad.", alternates: { canonical: absoluteUrl("/pricing") } };

export default function PricingPage() {
  return (
    <div className="space-y-24 pt-16 sm:pt-24">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: pricingFaq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <SectionIntro eyebrow="Pricing" title="Plans that grow with you" text="Every plan includes credits that never expire. One credit is one second of Standard presenter video. The form shows the credits for your choices before you start." />
      <PricingTable />
      <Reveal as="section">
        <SectionIntro eyebrow="Compare" title="Reelay vs doing it yourself" text="Your own numbers on the left, our plan prices and measured times on the right. Nothing assumed for you." />
        <div className="mt-10"><SavingsCalculator /></div>
      </Reveal>
      <ServiceSection />
      <section>
        <SectionIntro eyebrow="FAQ" title="About credits and plans" />
        <Accordion items={pricingFaq} className="mx-auto mt-10 max-w-3xl" />
      </section>
      <CtaBand />
    </div>
  );
}
