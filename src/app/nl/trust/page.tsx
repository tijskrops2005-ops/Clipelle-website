import type { Metadata } from "next";
import { TrustPage } from "@/components/pages/CompanyPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).trust;
export const metadata: Metadata = pageMeta(locale, "/trust", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <TrustPage locale={locale} />;
}
