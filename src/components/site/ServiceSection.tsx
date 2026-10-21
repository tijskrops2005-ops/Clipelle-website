import { ArrowRight } from "lucide-react";
import { services } from "@/content/services";
import { Button } from "@/components/ui/Button";
import { SectionIntro } from "@/components/site/SectionIntro";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

/** "Winning ads, made for you": the managed service. Numbers and times only from src/content/services.ts; no price. */
export function ServiceSection({ compact, locale = "en" }: { compact?: boolean; locale?: Locale }) {
  const t = dict(locale);
  const facts = [services.volumeRange && { label: t.service.volume, value: services.volumeRange }, services.turnaround && { label: t.service.turnaround, value: services.turnaround }].filter(Boolean) as { label: string; value: string }[];
  return (
    <section className="rounded-card bg-ink px-6 py-12 text-surface sm:px-10 sm:py-14">
      <SectionIntro eyebrow={t.service.eyebrow} title={t.service.title} text={t.service.text} className="[&_h2]:text-surface [&_p]:text-surface/70 [&_.label-mono]:text-surface/60" />
      {(facts.length > 0 || services.features.length > 0) && (
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="rounded-[14px] bg-white/5 p-4"><p className="label-mono text-surface/60">{f.label}</p><p className="mt-1 text-[17px] font-semibold">{f.value}</p></div>
          ))}
          {services.features.length > 0 && (
            <ul className="rounded-[14px] bg-white/5 p-4 text-[15px] sm:col-span-2">{services.features.map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{t}</li>)}</ul>
          )}
        </div>
      )}
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href={localizePath("/demo", locale)} variant="accent" size="lg">{t.common.bookDemo} <ArrowRight className="size-5" aria-hidden /></Button>
        {!compact && <Button href={localizePath("/services/done-for-you", locale)} variant="secondary" size="lg">{t.service.how}</Button>}
      </div>
      <p className="mt-4 text-center text-[13px] text-surface/60">{t.service.note}</p>
    </section>
  );
}
