import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StepList } from "@/components/ui/StepList";
import { Reveal } from "@/components/site/Reveal";
import { SectionIntro } from "@/components/site/SectionIntro";
import { FinalCta } from "@/components/site/Persuasion";
import { SoonBadge } from "@/components/site/SiteHeader";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  soon?: boolean;
  steps: { title: string; text: string }[];
  does: string[];
  doesNot: string[];
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  children?: ReactNode;
  locale?: Locale;
};

/** One layout for the four integration pages: what it is, how it works, what it does and does not do, then the CTA or the waitlist. */
export function IntegrationPage({ eyebrow, title, intro, soon, steps, does, doesNot, primary, secondary, children, locale = "en" }: Props) {
  const t = dict(locale);
  return (
    <div className="space-y-24 sm:space-y-32">
      <section className="pt-16 sm:pt-24">
        <p className="label-mono flex items-center gap-2 text-muted">{eyebrow}{soon && <SoonBadge label={t.common.soon} />}</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{title}</h1>
        <p className="mt-6 max-w-2xl text-subtitle text-muted">{intro}</p>
        {(primary || secondary) && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {primary && <Button href={primary.href} variant="accent" size="lg">{primary.label} <ArrowRight className="size-5" aria-hidden /></Button>}
            {secondary && <Button href={secondary.href} variant="secondary" size="lg">{secondary.label}</Button>}
          </div>
        )}
        {children}
      </section>
      <Reveal as="section">
        <SectionIntro eyebrow={t.common.howItWorks} title={soon ? t.integrations.howWill : t.common.howItWorks} />
        <StepList className="mt-10 [&>li]:bg-surface [&>li]:px-6 [&>li]:py-6 [&>li]:shadow-card" columns={steps.length as 3 | 4} items={steps} />
      </Reveal>
      <Reveal as="section">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-[17px] font-semibold">{soon ? t.integrations.will : t.integrations.does}</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-ink/85">{does.map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />{t}</li>)}</ul>
          </div>
          <div className="rounded-card bg-surface p-6 shadow-card">
            <h3 className="text-[17px] font-semibold">{t.integrations.doesNot}</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-ink/85">{doesNot.map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />{t}</li>)}</ul>
          </div>
        </div>
      </Reveal>
      <FinalCta locale={locale} />
    </div>
  );
}
