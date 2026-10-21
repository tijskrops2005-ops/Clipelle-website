import type { Metadata } from "next";
import { faq } from "@/content/faq";
import { SectionIntro } from "@/components/site/SectionIntro";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow="FAQ" title="Questions and answers" text="If yours is missing, book a demo or write to us." />
      <Accordion items={faq} className="mx-auto max-w-3xl" />
      <CtaBand />
    </div>
  );
}
