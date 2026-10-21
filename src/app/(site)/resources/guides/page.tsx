import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { guides } from "@/content/guides";
import { SectionIntro } from "@/components/site/SectionIntro";

export const metadata: Metadata = { title: "Guides" };

export default function GuidesPage() {
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Guides" title="Get more out of every video" text="Three short reads, written from what we learned building Reelay." />
      <ul className="grid gap-5 md:grid-cols-3">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/resources/guides/${g.slug}`} className="focus-ring group flex h-full flex-col rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <span className="label-mono flex items-center gap-1.5 text-muted"><Clock3 className="size-3.5" aria-hidden /> {g.minutes} min</span>
              <span className="mt-3 text-[17px] font-semibold text-ink">{g.title}</span>
              <span className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{g.summary}</span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">Read <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
