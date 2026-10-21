import type { Metadata } from "next";
import { SectionIntro } from "@/components/site/SectionIntro";
import { DemoRequestForm } from "@/components/site/DemoRequestForm";

export const metadata: Metadata = { title: "Book a demo" };

export default function DemoPage() {
  return (
    <div className="space-y-12 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Book a demo" title="See it with your own product" text="Tell us what you sell and what you want to make. We reply by e-mail with a time, or with a finished sample if that is faster." />
      <DemoRequestForm variant="demo" />
    </div>
  );
}
