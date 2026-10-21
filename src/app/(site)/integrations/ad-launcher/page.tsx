import type { Metadata } from "next";
import { IntegrationAdLauncherPage } from "@/components/pages/IntegrationPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).integrations.adLauncher;
export const metadata: Metadata = pageMeta(locale, "/integrations/ad-launcher", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <IntegrationAdLauncherPage locale={locale} />;
}
