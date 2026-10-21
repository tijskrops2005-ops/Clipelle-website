import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";
import { IntegrationPage } from "@/components/site/IntegrationPage";
import { WaitlistForm } from "@/components/site/WaitlistForm";

export function IntegrationApiPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const i = t.integrations.api;
  return <IntegrationPage locale={locale} eyebrow={i.eyebrow} title={i.title} intro={i.intro} primary={{ href: "/docs/api", label: i.primary }} secondary={{ href: "/signup", label: i.secondary }} steps={i.steps} does={i.does} doesNot={i.doesNot} />;
}

export function IntegrationMcpPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const i = t.integrations.mcp;
  return <IntegrationPage locale={locale} eyebrow={i.eyebrow} title={i.title} intro={i.intro} primary={{ href: "/docs/mcp", label: i.primary }} secondary={{ href: "/docs/api", label: i.secondary }} steps={i.steps} does={i.does} doesNot={i.doesNot} />;
}

export function IntegrationSlackPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const i = t.integrations.slack;
  return (
    <IntegrationPage locale={locale} soon eyebrow={i.eyebrow} title={i.title} intro={i.intro} steps={i.steps} does={i.does} doesNot={i.doesNot}>
      <div className="mt-8 rounded-card bg-surface p-6 shadow-card"><p className="text-[15px] font-semibold text-ink">{t.integrations.waitlistTitle}</p><p className="mb-4 mt-1 text-[13px] text-muted">{t.integrations.waitlistText}</p><WaitlistForm feature="slack" label={i.label} locale={locale} /></div>
    </IntegrationPage>
  );
}

export function IntegrationAdLauncherPage({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const i = t.integrations.adLauncher;
  return (
    <IntegrationPage locale={locale} soon eyebrow={i.eyebrow} title={i.title} intro={i.intro} steps={i.steps} does={i.does} doesNot={i.doesNot}>
      <div className="mt-8 rounded-card bg-surface p-6 shadow-card"><p className="text-[15px] font-semibold text-ink">{t.integrations.waitlistTitle}</p><p className="mb-4 mt-1 text-[13px] text-muted">{t.integrations.waitlistText}</p><WaitlistForm feature="ad-launcher" label={i.label} locale={locale} /></div>
    </IntegrationPage>
  );
}

export { localizePath };
