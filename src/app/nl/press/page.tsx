import type { Metadata } from "next";
import { PressPage } from "@/components/pages/CompanyPages";
import { dict } from "@/content/i18n";
import { config } from "@/lib/config";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const t = dict(locale).press;
// Translation-first description while ads are off (the ad wording returns with config.features.ads).
export const metadata: Metadata = pageMeta(locale, "/press", { title: t.metaTitle, description: config.features.ads ? t.metaDescription : t.translate.metaDescription });

export default function Page() {
  return <PressPage locale={locale} />;
}
