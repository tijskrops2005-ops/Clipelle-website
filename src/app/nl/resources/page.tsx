import type { Metadata } from "next";
import { ResourcesPage } from "@/components/pages/SimplePages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).resources;
export const metadata: Metadata = pageMeta(locale, "/resources", { title: t.metaTitle, description: undefined });

export default function Page() {
  return <ResourcesPage locale={locale} />;
}
