import type { Metadata } from "next";
import { IntegrationMcpPage } from "@/components/pages/IntegrationPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).integrations.mcp;
export const metadata: Metadata = pageMeta(locale, "/integrations/mcp", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <IntegrationMcpPage locale={locale} />;
}
