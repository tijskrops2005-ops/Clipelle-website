import type { Metadata } from "next";
import { CustomersPage } from "@/components/pages/CompanyPages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).customers;
export const metadata: Metadata = pageMeta(locale, "/customers", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <CustomersPage locale={locale} />;
}
