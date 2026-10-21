import type { Metadata } from "next";
import { PlatformAdsPage } from "@/components/pages/PlatformAdsPage";
import { dict } from "@/content/i18n";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).platformAds;
export const metadata: Metadata = pageMeta(locale, "/platform/ads", { title: t.metaTitle, description: t.metaDescription });

export default function Page() {
  return <PlatformAdsPage locale={locale} />;
}
