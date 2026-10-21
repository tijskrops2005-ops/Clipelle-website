import type { Metadata } from "next";
import { GuidesIndexPage } from "@/components/pages/SimplePages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).guidesIndex;
export const metadata: Metadata = pageMeta(locale, "/resources/guides", { title: t.metaTitle, description: t.text });

export default function Page() {
  return <GuidesIndexPage locale={locale} />;
}
