import type { Metadata } from "next";
import { PartnersPage } from "@/components/pages/CompanyPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).partners;
export const metadata: Metadata = pageMeta(locale, "/partners", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <PartnersPage locale={locale} />;
}
