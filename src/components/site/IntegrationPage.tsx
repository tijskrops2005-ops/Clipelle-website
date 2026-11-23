import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { PageHero, PageSection, StepLines } from "@/components/site/PageHero";
import { FinalCta } from "@/components/site/Persuasion";
import { SoonBadge } from "@/components/site/SiteHeader";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";

type Props = {
  /** Ignored since 23 Nov 2026 (no eyebrow labels); kept for the call sites. */
  eyebrow?: string;
  title: string;
  intro: string;
  soon?: boolean;
  stepsTitle?: string;
  steps: { title: string; text: string }[];
  does: string[];
  doesNot: string[];
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  children?: ReactNode;
  locale?: Locale;
};

/**
 * One layout for the integration pages and the coming-soon pages (23 Nov 2026): title, one line,
 * the buttons or the waitlist, the steps in a line each. A live integration also lists what it does
 * and does not do; a coming-soon page stops after the steps.
 */
export function IntegrationPage({ title, intro, soon, stepsTitle, steps, does, doesNot, primary, secondary, children, locale = "en" }: Props) {
  const t = dict(locale);
  return (
    <div className="space-y-24 sm:space-y-32">
      <div>
        <PageHero
          align="left"
          title={soon ? <span className="inline-flex flex-wrap items-center gap-3">{title}<SoonBadge label={t.common.soon} /></span> : title}
          text={intro}
          actions={(primary || secondary) ? <>{primary && <Button href={primary.href} variant="accent" size="lg">{primary.label}</Button>}{secondary && <Button href={secondary.href} variant="secondary" size="lg">{secondary.label}</Button>}</> : undefined}
        />
        {children}
      </div>
      <PageSection title={stepsTitle ?? t.integrations.howWill}>
        <StepLines className={steps.length === 3 ? "lg:grid-cols-3" : undefined} items={steps} />
      </PageSection>
      {!soon && (
        <PageSection>
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">{t.integrations.does}</h3>
              <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink/85">{does.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">{t.integrations.doesNot}</h3>
              <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink/85">{doesNot.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </PageSection>
      )}
      <FinalCta locale={locale} />
    </div>
  );
}

/** The waitlist under a coming-soon title: one line and the form, no card. */
export function WaitlistBlock({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="mt-8 max-w-lg">
      <p className="text-[15px] text-muted">{text}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
