import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { publishedCaseStudies } from "@/content/case-studies";
import { absoluteUrl } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { SectionIntro } from "@/components/site/SectionIntro";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = { title: "Customers", description: "Stories from brands that use Reelay, in their own words, with their permission.", alternates: { canonical: absoluteUrl("/customers") } };

/** Customer stories from src/content/case-studies.ts only. Empty = an honest "coming soon", never an invented story. */
export default function CustomersPage() {
  const stories = publishedCaseStudies();
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <SectionIntro eyebrow="Customers" title="Stories coming soon" text="We publish a story only when a customer shares it with us and agrees to be named. The first ones are being written together with the brands that use Reelay." />
      {stories.length === 0 ? (
        <section className="mx-auto max-w-2xl rounded-card bg-surface p-8 text-center shadow-card">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent-soft text-accent"><BookOpen className="size-5" aria-hidden /></span>
          <h2 className="mt-5 text-title">Share your story</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">Using Reelay for your shop or your clients? Book a short call; we write the story with you, in your words, and publish it only with your approval.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/demo" variant="primary">Book a demo <ArrowRight className="size-4" aria-hidden /></Button>
            <Button href="/examples" variant="secondary">See example videos</Button>
          </div>
        </section>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {stories.map((s) => (
            <li key={s.slug}>
              <Link href={`/customers/${s.slug}`} className="focus-ring block h-full rounded-card bg-surface p-6 shadow-card hover:shadow-card-hover">
                <p className="label-mono text-muted">{s.company}{s.industry ? ` · ${s.industry}` : ""}</p>
                <p className="mt-2 text-[20px] font-semibold text-ink">{s.title}</p>
                <p className="mt-2 text-[15px] text-muted">{s.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CtaBand />
    </div>
  );
}
