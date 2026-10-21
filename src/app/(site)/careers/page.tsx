import type { Metadata } from "next";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/site";
import { Badge } from "@/components/ui/Badge";
import { SectionIntro } from "@/components/site/SectionIntro";
import { CareersForm } from "@/components/site/CareersForm";

export const metadata: Metadata = { title: "Careers", description: "How we work at Reelay, and how to get in touch when there are no open roles.", alternates: { canonical: absoluteUrl("/careers") } };

const values = [
  { title: "Small and direct", text: "A founder who sells products online and a small circle of people who build. Decisions are made in plain language and written down." },
  { title: "The process is the product", text: "We do not chase every new model. We keep one production process reliable and make it cheaper and clearer." },
  { title: "Honest by default", text: "Costs before you click, real amounts afterwards, no invented numbers on the site. The same honesty applies inside the team." },
  { title: "Written over spoken", text: "Plans, decisions and reviews live in the repository and the docs, so anyone can catch up without a meeting." },
];

/** Careers: honest. No open roles today, no invented team, an open application that is simply stored. */
export default function CareersPage() {
  return (
    <div className="space-y-24 pt-16 sm:pt-24 sm:space-y-32">
      <SectionIntro eyebrow="Careers" title={`Working on ${config.productName}`} text="There are no open roles right now. If you would like to work on this anyway, tell us what you do; we keep your message and get back to you when something fits." />
      <section>
        <ul className="grid gap-5 sm:grid-cols-2">
          {values.map((v) => (
            <li key={v.title} className="rounded-card bg-surface p-6 shadow-card">
              <p className="text-[17px] font-semibold text-ink">{v.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{v.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mx-auto max-w-2xl rounded-card bg-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-title">Open application</h2>
          <Badge tone="warning">No open roles right now</Badge>
        </div>
        <p className="mb-6 mt-2 text-[15px] text-muted">Your message is stored and read by a person. We do not share it and we do not use it for anything else.</p>
        <CareersForm />
      </section>
    </div>
  );
}
