import type { Metadata } from "next";
import { faq } from "@/content/faq";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";
import { JsonLd } from "@/components/site/JsonLd";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "FAQ", description: "Questions and answers about making ads, translating videos, credits, rights and the API.", alternates: { canonical: absoluteUrl("/resources/faq") } };

export default function FaqPage() {
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <SectionIntro eyebrow="FAQ" title="Questions and answers" text="If yours is missing, book a demo or write to us." />
      <Accordion items={faq} className="mx-auto max-w-3xl" />
      <CtaBand />
    </div>
  );
}
