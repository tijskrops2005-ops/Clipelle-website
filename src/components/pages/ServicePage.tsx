import { ArrowRight } from "lucide-react";
import { services } from "@/content/services";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { ServiceRequestForm } from "@/components/site/ServiceRequestForm";

export function ServicePage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const s = t.servicePage;
  const facts = [services.volumeRange && { label: t.service.volume, value: services.volumeRange }, services.turnaround && { label: t.service.turnaround, value: services.turnaround }].filter(Boolean) as { label: string; value: string }[];
  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="pt-16 sm:pt-24">
        <p className="label-mono text-muted">{t.service.eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{t.service.title}</h1>
        <p className="mt-6 max-w-2xl text-subtitle text-muted">{s.intro}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button href={localizePath("/demo", locale)} variant="accent" size="lg">{t.common.bookDemo} <ArrowRight className="size-5" aria-hidden /></Button><Button href="#request" variant="secondary" size="lg">{s.requestCall}</Button></div>
        <p className="mt-3 text-[13px] text-muted">{s.note}</p>
      </section>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.howItWorks} title={s.stepsTitle} />
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={4} items={s.steps} />
      </Reveal>
      {(facts.length > 0 || services.features.length > 0) && (
        <Reveal as="section">
          <SectionIntro eyebrow={s.includedEyebrow} title={s.includedTitle} />
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {facts.map((f) => <div key={f.label} className="rounded-card bg-surface p-5 shadow-card"><p className="label-mono text-muted">{f.label}</p><p className="mt-1 text-[17px] font-semibold text-ink">{f.value}</p></div>)}
            {services.features.length > 0 && <ul className="rounded-card bg-surface p-5 shadow-card text-[15px] text-ink/85 sm:col-span-2">{services.features.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{x}</li>)}</ul>}
          </div>
        </Reveal>
      )}
      <Reveal as="section" className="grid gap-5 md:grid-cols-2">
        <div className="rounded-card bg-surface p-6 shadow-card"><h2 className="text-[17px] font-semibold">{s.weDo}</h2><ul className="mt-3 space-y-2 text-[15px] text-ink/85">{s.weDoItems.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />{x}</li>)}</ul></div>
        <div className="rounded-card bg-surface p-6 shadow-card"><h2 className="text-[17px] font-semibold">{s.weDoNot}</h2><ul className="mt-3 space-y-2 text-[15px] text-ink/85">{s.weDoNotItems.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{x}</li>)}</ul></div>
      </Reveal>
      <Reveal as="section" className="mx-auto max-w-2xl rounded-card bg-surface p-6 shadow-card sm:p-8">
        <h2 id="request" className="text-title scroll-mt-28">{s.formTitle}</h2>
        <p className="mb-6 mt-2 text-[15px] text-muted">{s.formText}</p>
        <ServiceRequestForm locale={locale} />
      </Reveal>
    </div>
  );
}
