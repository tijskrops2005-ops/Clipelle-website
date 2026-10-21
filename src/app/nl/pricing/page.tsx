import type { Metadata } from "next";
import { PricingPage } from "@/components/pages/PricingPage";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).pricing;
export const metadata: Metadata = pageMeta(locale, "/pricing", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <PricingPage locale={locale} />;
}
