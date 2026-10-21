import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/SimplePages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).contact;
export const metadata: Metadata = pageMeta(locale, "/contact", { title: t.metaTitle, description: t.text });

export default function Page() {
  return <ContactPage locale={locale} />;
}
