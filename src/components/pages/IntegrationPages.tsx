import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { IntegrationPage, WaitlistBlock } from "@/components/site/IntegrationPage";
import { WaitlistForm } from "@/components/site/WaitlistForm";

export function IntegrationApiPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const i = t.integrations.api;
  return <IntegrationPage locale={locale} title={i.title} intro={i.intro} primary={{ href: "/docs/api", label: i.primary }} secondary={{ href: "/signup", label: i.secondary }} stepsTitle={i.stepsTitle} steps={i.steps} does={i.does} doesNot={i.doesNot} />;
}

export function IntegrationMcpPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const i = t.integrations.mcp;
  return <IntegrationPage locale={locale} title={i.title} intro={i.intro} primary={{ href: "/docs/mcp", label: i.primary }} secondary={{ href: "/docs/api", label: i.secondary }} stepsTitle={i.stepsTitle} steps={i.steps} does={i.does} doesNot={i.doesNot} />;
}

export function IntegrationSlackPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const i = t.integrations.slack;
  return (
    <IntegrationPage locale={locale} soon title={i.title} intro={i.intro} steps={i.steps} does={i.does} doesNot={i.doesNot}>
      <WaitlistBlock text={t.integrations.waitlistText}><WaitlistForm feature="slack" label={i.label} locale={locale} /></WaitlistBlock>
    </IntegrationPage>
  );
}

export function IntegrationAdLauncherPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const i = t.integrations.adLauncher;
  return (
    <IntegrationPage locale={locale} soon title={i.title} intro={i.intro} steps={i.steps} does={i.does} doesNot={i.doesNot}>
      <WaitlistBlock text={t.integrations.waitlistText}><WaitlistForm feature="ad-launcher" label={i.label} locale={locale} /></WaitlistBlock>
    </IntegrationPage>
  );
}

export { localizePath };
