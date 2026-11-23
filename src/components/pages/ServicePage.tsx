import { services } from "@/content/services";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { PageHero, PageSection, StepLines } from "@/components/site/PageHero";
import { FinalCta } from "@/components/site/Persuasion";
import { ServiceRequestForm } from "@/components/site/ServiceRequestForm";

/** The managed service: title, one line, the steps, what is and is not included, the form. No price anywhere. */
export function ServicePage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const s = t.servicePage;
  const facts = [services.volumeRange && { label: t.service.volume, value: services.volumeRange }, services.turnaround && { label: t.service.turnaround, value: services.turnaround }].filter(Boolean) as { label: string; value: string }[];
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageHero title={t.service.title} text={s.intro} note={s.note} actions={<Button href="#request" variant="accent" size="lg">{s.requestCall}</Button>} />
      <PageSection title={s.stepsTitle}>
        <StepLines items={s.steps} />
      </PageSection>
      <PageSection title={s.includedTitle}>
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">{s.weDo}</h3>
            <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink/85">{s.weDoItems.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">{s.weDoNot}</h3>
            <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink/85">{s.weDoNotItems.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          {(facts.length > 0 || services.features.length > 0) && (
            <dl className="grid gap-4 sm:grid-cols-2 md:col-span-2">
              {facts.map((f) => <div key={f.label} className="border-t border-divider pt-3"><dt className="text-[13px] text-muted">{f.label}</dt><dd className="mt-0.5 text-[15px] font-medium text-ink">{f.value}</dd></div>)}
              {services.features.map((x) => <div key={x} className="border-t border-divider pt-3 text-[15px] text-ink/85 sm:col-span-2">{x}</div>)}
            </dl>
          )}
        </div>
      </PageSection>
      <PageSection id="request" title={s.formTitle} text={s.formText} className="mx-auto max-w-2xl">
        <ServiceRequestForm locale={locale} />
      </PageSection>
      <FinalCta locale={locale} />
    </div>
  );
}
