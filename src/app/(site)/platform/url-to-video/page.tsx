import type { Metadata } from "next";
import { PlatformUrlPage } from "@/components/pages/PlatformUrlPage";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "en" as const;
const t = dict(locale).platformUrl;
export const metadata: Metadata = pageMeta(locale, "/platform/url-to-video", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <PlatformUrlPage locale={locale} />;
}
