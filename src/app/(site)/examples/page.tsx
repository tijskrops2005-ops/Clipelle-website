import type { Metadata } from "next";
import { ExamplesPage } from "@/components/pages/ExamplesPage";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).examples;
export const metadata: Metadata = pageMeta(locale, "/examples", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <ExamplesPage locale={locale} />;
}
