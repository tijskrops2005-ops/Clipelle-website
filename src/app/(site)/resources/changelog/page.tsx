import type { Metadata } from "next";
import { ChangelogPage } from "@/components/pages/SimplePages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).changelog;
export const metadata: Metadata = pageMeta(locale, "/resources/changelog", { title: t.metaTitle, description: t.text });

export default function Page() {
  return <ChangelogPage locale={locale} />;
}
