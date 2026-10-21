import type { Metadata } from "next";
import { AboutPage } from "@/components/pages/SimplePages";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).about;
export const metadata: Metadata = pageMeta(locale, "/about", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <AboutPage locale={locale} />;
}
