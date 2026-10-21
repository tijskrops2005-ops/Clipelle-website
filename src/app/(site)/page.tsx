import type { Metadata } from "next";
import { HomePage } from "@/components/pages/HomePage";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).home;
export const metadata: Metadata = pageMeta(locale, "/", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <HomePage locale={locale} />;
}
