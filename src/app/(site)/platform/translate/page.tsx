import type { Metadata } from "next";
import { PlatformTranslatePage } from "@/components/pages/PlatformTranslatePage";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).platformTranslate;
export const metadata: Metadata = pageMeta(locale, "/platform/translate", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <PlatformTranslatePage locale={locale} />;
}
