import type { Metadata } from "next";
import { CareersPage } from "@/components/pages/CompanyPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).careers;
export const metadata: Metadata = pageMeta(locale, "/careers", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <CareersPage locale={locale} />;
}
