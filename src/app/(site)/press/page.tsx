import type { Metadata } from "next";
import { PressPage } from "@/components/pages/CompanyPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).press;
export const metadata: Metadata = pageMeta(locale, "/press", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <PressPage locale={locale} />;
}
