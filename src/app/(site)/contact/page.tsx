import type { Metadata } from "next";
import { SectionIntro } from "@/components/site/SectionIntro";
import { DemoRequestForm } from "@/components/site/DemoRequestForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="space-y-12 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Contact" title="Send us a message" text="Questions about a plan, a problem with a video, a feature you miss. We read everything." />
      <DemoRequestForm variant="contact" />
    </div>
  );
}
