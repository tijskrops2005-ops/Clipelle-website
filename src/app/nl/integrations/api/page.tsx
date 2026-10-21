import type { Metadata } from "next";
import { IntegrationApiPage } from "@/components/pages/IntegrationPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).integrations.api;
export const metadata: Metadata = pageMeta(locale, "/integrations/api", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <IntegrationApiPage locale={locale} />;
}
