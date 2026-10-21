import type { Metadata } from "next";
import { DemoPage } from "@/components/pages/SimplePages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).demo;
export const metadata: Metadata = pageMeta(locale, "/demo", { title: t.metaTitle, description: t.text });

export default function Page() {
  return <DemoPage locale={locale} />;
}
