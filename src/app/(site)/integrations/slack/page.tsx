import type { Metadata } from "next";
import { IntegrationSlackPage } from "@/components/pages/IntegrationPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).integrations.slack;
export const metadata: Metadata = pageMeta(locale, "/integrations/slack", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <IntegrationSlackPage locale={locale} />;
}
