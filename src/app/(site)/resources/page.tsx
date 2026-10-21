import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionIntro } from "@/components/site/SectionIntro";
import { resourcesMenu } from "@/components/site/siteNav";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage() {
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Resources" title="Short reads, straight answers" />
      <ul className="grid gap-5 md:grid-cols-3">
        {resourcesMenu.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="focus-ring group flex h-full flex-col rounded-card bg-surface p-6 shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
              <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent"><c.icon className="size-5" aria-hidden /></span>
              <span className="mt-4 text-[17px] font-semibold text-ink">{c.title}</span>
              <span className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{c.text}</span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">Open <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
