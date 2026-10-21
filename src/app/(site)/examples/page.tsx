import type { Metadata } from "next";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ExampleGallery } from "@/components/site/ExampleGallery";
import { Reveal } from "@/components/site/Reveal";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = { title: "Examples", description: "Finished videos made with Reelay." };

export default function ExamplesPage() {
  return (
    <div className="space-y-24 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Examples" title="Made with Reelay" text="Every video here is our own output, labelled as such. More samples are added as real customers approve theirs." />
      <section className="space-y-6">
        <h2 className="text-title">Ads from a product photo</h2>
        <ExampleGallery kind="ad" limit={6} />
      </section>
      <section className="space-y-6">
        <h2 className="text-title">Translated videos</h2>
        <ExampleGallery kind="translate" limit={6} />
      </section>
      <Reveal as="section"><CtaBand /></Reveal>
    </div>
  );
}
