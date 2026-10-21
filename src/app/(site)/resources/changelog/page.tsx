import type { Metadata } from "next";
import { changelog } from "@/content/changelog";
import { SectionIntro } from "@/components/site/SectionIntro";

export const metadata: Metadata = { title: "Changelog" };

export default function ChangelogPage() {
  return (
    <div className="space-y-16 pt-16 sm:pt-24">
      <SectionIntro eyebrow="Changelog" title="What changed" text="In plain words, newest first." />
      <ol className="mx-auto max-w-2xl space-y-8">
        {changelog.map((e) => (
          <li key={e.date + e.title} className="rounded-card bg-surface p-6 shadow-card">
            <p className="label-mono text-muted">{e.date}</p>
            <h2 className="mt-2 text-[17px] font-semibold text-ink">{e.title}</h2>
            <ul className="mt-3 space-y-1.5 text-[15px] text-ink/85">
              {e.items.map((i) => (
                <li key={i} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{i}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
