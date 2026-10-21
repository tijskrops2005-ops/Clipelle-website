import type { Metadata } from "next";
import { ServicePage } from "@/components/pages/ServicePage";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).servicePage;
export const metadata: Metadata = pageMeta(locale, "/services/done-for-you", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <ServicePage locale={locale} />;
}
