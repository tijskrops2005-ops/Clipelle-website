import type { Metadata } from "next";
import { legalDocBySlug } from "@/content/legal";
import { LegalPage } from "@/components/site/LegalPage";
import { pageMeta } from "@/lib/i18n";

const locale = "nl" as const;
const doc = legalDocBySlug("data", locale)!;
export const metadata: Metadata = pageMeta(locale, "/legal/data", { title: doc.title, description: doc.summary });

export default function Page() {
  return <LegalPage doc={doc} locale={locale} />;
}
