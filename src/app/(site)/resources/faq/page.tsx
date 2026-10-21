import type { Metadata } from "next";
import { FaqPage } from "@/components/pages/SimplePages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).faqPage;
export const metadata: Metadata = pageMeta(locale, "/resources/faq", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <FaqPage locale={locale} />;
}
