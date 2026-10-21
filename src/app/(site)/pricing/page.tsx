import type { Metadata } from "next";
import { faq } from "@/content/faq";
import { SectionIntro } from "@/components/site/SectionIntro";
import { PricingTable } from "@/components/site/PricingTable";
import { Accordion } from "@/components/site/Accordion";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = { title: "Pricing", description: "Plans with monthly credits, credit packs and one free ad." };

export default function PricingPage() {
  return (
    <div className="space-y-24 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Pricing" title="Plans that grow with you" text="Every plan includes credits. One credit is one second of Standard presenter video. The form shows the credits for your choices before you start." />
      <PricingTable />
      <section>
        <SectionIntro eyebrow="FAQ" title="About credits and plans" />
        <Accordion items={faq.filter((f) => /credit|cost|cancel|carry/i.test(f.q))} className="mx-auto mt-10 max-w-3xl" />
      </section>
      <CtaBand />
    </div>
  );
}
